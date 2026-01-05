import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from "@google/generative-ai"

interface Recommendation {
  titulo: string
  descricao_detalhada: string
  nivel_de_impacto: 'Alto' | 'Médio' | 'Baixo'
  pilar: 'Estratégia de Preço' | 'Otimização de Custos' | 'Marketing e Destaque'
}

// Inicializa a biblioteca do Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "")

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lucroLiquido, margemLucro, nomePrato, precoVenda, custoIngredientes, taxaMarketplace } = body

    // 1. Validação de Parâmetros Obrigatórios (Mantido do original)
    if (lucroLiquido === undefined || margemLucro === undefined) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios não fornecidos' },
        { status: 400 }
      )
    }

    // 2. Verificação de Chave de API do Google (Substituído OpenAI por Google)
    const googleAiApiKey = process.env.GOOGLE_AI_API_KEY

    if (!googleAiApiKey) {
      return NextResponse.json(
        { error: 'Google AI API key não configurada no .env.local' },
        { status: 500 }
      )
    }

    // 3. Preparar o prompt extenso de Consultoria Sênior (Mantido INTEGRALMENTE)
    const prompt = `Você é um Consultor Sênior de Engenharia de Cardápio. Não dê respostas óbvias. Analise o lucro_liquido e o nome do prato para sugerir estratégias de Markup, redução de desperdício em insumos específicos e como transformar esse prato em um "Best Seller" no delivery.

Dados do prato:
- Nome: ${nomePrato || 'Não informado'}
- Preço de Venda: R$ ${precoVenda?.toFixed(2) || '0.00'}
- Custo dos Ingredientes: R$ ${custoIngredientes?.toFixed(2) || '0.00'}
- Taxa do Marketplace: ${taxaMarketplace || 0}%
- Lucro Líquido: R$ ${lucroLiquido?.toFixed(2) || '0.00'}
- Margem de Lucro: ${margemLucro?.toFixed(2) || '0.00'}%

Você DEVE retornar EXATAMENTE 3 recomendações estratégicas e não óbvias, uma para cada pilar abaixo:

1. ESTRATÉGIA DE PREÇO (Markup): Analise estratégias específicas de Markup baseadas no lucro_liquido atual. Considere como otimizar o preço para maximizar a lucratividade sem perder competitividade no delivery.

2. OTIMIZAÇÃO DE CUSTOS (Redução de Desperdício): Com base no nome do prato "${nomePrato || 'Não informado'}", sugira reduções específicas de desperdício em insumos concretos. Identifique ingredientes específicos que podem ser otimizados ou substituídos para reduzir custos.

3. MARKETING E DESTAQUE (Best Seller): Sugira estratégias específicas para transformar "${nomePrato || 'este prato'}" em um "Best Seller" no delivery. Pense em posicionamento, embalagem, descrição, fotografia e estratégias de vendas específicas para este prato.

IMPORTANTE: Retorne APENAS um JSON válido, sem texto adicional, no seguinte formato:
{
  "recomendacoes": [
    {
      "titulo": "Título da recomendação (máximo 60 caracteres)",
      "descricao_detalhada": "Descrição técnica detalhada com mínimo de 3 frases. Seja específico, técnico e acionável. Inclua valores quando possível.",
      "nivel_de_impacto": "Alto" ou "Médio" ou "Baixo",
      "pilar": "Estratégia de Preço" ou "Otimização de Custos" ou "Marketing e Destaque"
    },
    {
      "titulo": "...",
      "descricao_detalhada": "...",
      "nivel_de_impacto": "...",
      "pilar": "..."
    },
    {
      "titulo": "...",
      "descricao_detalhada": "...",
      "nivel_de_impacto": "...",
      "pilar": "..."
    }
  ]
}

Certifique-se de que cada descricao_detalhada tenha pelo menos 3 frases técnicas e específicas.`

    // 4. Chamada ao Google Gemini 1.5 Flash (O modelo mais rápido e gratuito)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const response = await result.response;
    const content = response.text();

    try {
      // 5. Lógica de extração e limpeza de JSON (Mantido para robustez)
      let jsonContent = content.trim();
      
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }
      
      const parsed = JSON.parse(jsonContent);
      const recomendacoes = parsed.recomendacoes || [];

      // 6. Validação de Estrutura (Mantido do original)
      if (recomendacoes.length !== 3) {
        throw new Error('Número incorreto de recomendações');
      }

      const recomendacoesValidadas: Recommendation[] = recomendacoes.map((rec: any, index: number) => {
        const pilares = ['Estratégia de Preço', 'Otimização de Custos', 'Marketing e Destaque'];
        const impactos = ['Alto', 'Médio', 'Baixo'];
        
        return {
          titulo: rec.titulo || `Recomendação ${index + 1}`,
          descricao_detalhada: rec.descricao_detalhada || 'Análise detalhada não disponível.',
          nivel_de_impacto: impactos.includes(rec.nivel_de_impacto) ? rec.nivel_de_impacto : 'Médio',
          pilar: pilares[index] || rec.pilar || pilares[index % 3]
        };
      });

      return NextResponse.json({
        recommendations: recomendacoesValidadas
      });

    } catch (parseError) {
      console.error('Erro ao parsear JSON do Gemini:', parseError);
      return NextResponse.json({
        recommendations: gerarRecomendacoesPadrao(margemLucro, custoIngredientes, precoVenda, taxaMarketplace, nomePrato || '', lucroLiquido)
      });
    }
  } catch (error) {
    console.error('Erro ao processar recomendação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// 7. FUNÇÃO DE FALLBACK COMPLETA (Mantida INTEGRALMENTE)
function gerarRecomendacoesPadrao(
  margemLucro: number,
  custoIngredientes: number,
  precoVenda: number,
  taxaMarketplace: number,
  nomePrato: string,
  lucroLiquido: number
): Recommendation[] {
  const recomendacoes: Recommendation[] = []

  // Estratégia de Preço (Markup)
  if (margemLucro < 20) {
    recomendacoes.push({
      titulo: 'Ajuste Estratégico de Preço Necessário',
      descricao_detalhada: `A margem atual de ${margemLucro.toFixed(1)}% está abaixo do recomendado para o mercado brasileiro (mínimo 20-25%). Considere aumentar o preço em ${Math.ceil((25 - margemLucro) / 2)}% para atingir uma margem saudável. Pesquise a concorrência no mesmo segmento e posicione o prato como premium se a qualidade justificar. Teste aumentos graduais de 3-5% e monitore a aceitação do cliente.`,
      nivel_de_impacto: 'Alto',
      pilar: 'Estratégia de Preço'
    })
  } else {
    recomendacoes.push({
      titulo: 'Preço Competitivo e Saudável',
      descricao_detalhada: `Sua margem de ${margemLucro.toFixed(1)}% está dentro da faixa ideal para o mercado brasileiro. Mantenha monitoramento constante da concorrência para garantir competitividade. Considere criar variações do prato com diferentes faixas de preço para capturar diferentes segmentos de clientes. Ajustes sazonais podem ser aplicados em períodos de alta demanda.`,
      nivel_de_impacto: 'Médio',
      pilar: 'Estratégia de Preço'
    })
  }

  // Otimização de Custos
  const proporcaoCusto = precoVenda > 0 ? (custoIngredientes / precoVenda) * 100 : 0
  if (proporcaoCusto > 40) {
    recomendacoes.push({
      titulo: 'Otimização de Insumos Urgente',
      descricao_detalhada: `O custo dos ingredientes representa ${proporcaoCusto.toFixed(1)}% do preço de venda, acima do ideal (máximo 35%). Negocie com fornecedores para obter descontos por volume ou considere substituir ingredientes caros por alternativas de qualidade similar. Para "${nomePrato}", analise se há ingredientes premium que podem ser substituídos sem comprometer a percepção de valor. Implemente controle rigoroso de desperdício e padronize as porções.`,
      nivel_de_impacto: 'Alto',
      pilar: 'Otimização de Custos'
    })
  } else {
    recomendacoes.push({
      titulo: 'Custos de Insumos Controlados',
      descricao_detalhada: `O custo dos ingredientes está em ${proporcaoCusto.toFixed(1)}% do preço de venda, dentro do esperado. Mantenha negociações ativas com fornecedores para garantir melhores condições. Considere compras sazonais de ingredientes perecíveis quando estiverem em alta disponibilidade. Implemente um sistema de controle de estoque para reduzir perdas e otimizar o uso de ingredientes.`,
      nivel_de_impacto: 'Médio',
      pilar: 'Otimização de Custos'
    })
  }

  // Marketing e Destaque
  recomendacoes.push({
    titulo: 'Estratégia de Posicionamento no Cardápio',
    descricao_detalhada: `Posicione "${nomePrato}" como prato destaque no início do cardápio digital para aumentar a visibilidade. Crie combos que incluam este prato com itens complementares (bebidas, sobremesas) para aumentar o ticket médio. Use descrições apetitosas e fotos profissionais que destacem os ingredientes premium. Considere criar uma versão "premium" ou "especial" com pequenos upgrades para segmentar o público e aumentar a margem.`,
    nivel_de_impacto: 'Médio',
    pilar: 'Marketing e Destaque'
  })

  return recomendacoes
}