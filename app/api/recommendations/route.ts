import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from "@google/generative-ai"

interface Recommendation {
  titulo: string
  descricao_detalhada: string
  nivel_de_impacto: 'Alto' | 'Médio' | 'Baixo'
  pilar: 'Estratégia de Preço' | 'Otimização de Custos' | 'Marketing e Destaque'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lucroLiquido, margemLucro, nomePrato, precoVenda, custoIngredientes, taxaMarketplace } = body

    // 1. LOG DE SEGURANÇA: Verifica se a chave existe (Sem mostrar a chave toda)
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    console.log("DEBUG - Chave configurada?", apiKey ? "SIM (Primeiros 5 caracteres: " + apiKey.substring(0, 5) + ")" : "NÃO (ESTÁ VAZIA)");

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Erro Técnico: A chave GOOGLE_AI_API_KEY não foi encontrada nas variáveis de ambiente da Vercel.' },
        { status: 500 }
      )
    }

    // Inicializa a IA dentro do handler para garantir que pegue a chave atualizada
    const genAI = new GoogleGenerativeAI(apiKey)

    // 2. Prompt Sênior (Mantido INTEGRALMENTE conforme solicitado)
    const prompt = `Você é um Consultor Sênior de Engenharia de Cardápio. Não dê respostas óbvias. Analise o lucro_liquido e o nome do prato para sugerir estratégias de Markup, redução de desperdício em insumos específicos e como transformar esse prato em um "Best Seller" no delivery.

Dados do prato:
- Nome: ${nomePrato || 'Não informado'}
- Preço de Venda: R$ ${precoVenda?.toFixed(2) || '0.00'}
- Custo dos Ingredientes: R$ ${custoIngredientes?.toFixed(2) || '0.00'}
- Taxa do Marketplace: ${taxaMarketplace || 0}%
- Lucro Líquido: R$ ${lucroLiquido?.toFixed(2) || '0.00'}
- Margem de Lucro: ${margemLucro?.toFixed(2) || '0.00'}%

Você DEVE retornar EXATAMENTE 3 recomendações estratégicas e não óbvias, uma para cada pilar abaixo:
1. ESTRATÉGIA DE PREÇO (Markup)
2. OTIMIZAÇÃO DE CUSTOS (Redução de Desperdício)
3. MARKETING E DESTAQUE (Best Seller)

IMPORTANTE: Retorne APENAS um JSON válido seguindo a estrutura:
{
  "recomendacoes": [
    {
      "titulo": "...",
      "descricao_detalhada": "...",
      "nivel_de_impacto": "Alto" | "Médio" | "Baixo",
      "pilar": "Estratégia de Preço" | "Otimização de Custos" | "Marketing e Destaque"
    }
  ]
}`;

    // 3. Chamada ao Modelo Gratuito e Rápido
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    try {
      const parsed = JSON.parse(content);
      const recomendacoes = parsed.recomendacoes || [];

      // Validação de segurança
      const recomendacoesValidadas: Recommendation[] = recomendacoes.map((rec: any, index: number) => ({
        titulo: rec.titulo || `Sugestão ${index + 1}`,
        descricao_detalhada: rec.descricao_detalhada || 'Sem descrição técnica.',
        nivel_de_impacto: rec.nivel_de_impacto || 'Médio',
        pilar: rec.pilar || 'Estratégia de Preço'
      }));

      return NextResponse.json({ recommendations: recomendacoesValidadas });

    } catch (parseError) {
      console.error('Erro no parse do JSON:', parseError);
      return NextResponse.json({
        recommendations: gerarRecomendacoesPadrao(margemLucro, custoIngredientes, precoVenda, taxaMarketplace, nomePrato || '', lucroLiquido)
      });
    }

  } catch (error: any) {
    // 4. LOG DE ERRO REAL: Captura o motivo do "Error Fetching"
    console.error("ERRO REAL DA API GOOGLE:", error.message);
    return NextResponse.json(
      { error: `Falha na IA: ${error.message}. Verifique a sua chave no painel da Vercel.` },
      { status: 500 }
    )
  }
}

// 5. Função de Fallback (Mantida integralmente)
function gerarRecomendacoesPadrao(margemLucro: number, custoIngredientes: number, precoVenda: number, taxaMarketplace: number, nomePrato: string, lucroLiquido: number): Recommendation[] {
  return [
    {
      titulo: 'Ajuste de Preço Sugerido',
      descricao_detalhada: `Sua margem de ${margemLucro.toFixed(1)}% sugere que o preço atual pode ser otimizado.`,
      nivel_de_impacto: 'Alto',
      pilar: 'Estratégia de Preço'
    },
    {
      titulo: 'Otimização de Custos',
      descricao_detalhada: `O custo de R$ ${custoIngredientes.toFixed(2)} representa um desafio para o prato ${nomePrato}.`,
      nivel_de_impacto: 'Médio',
      pilar: 'Otimização de Custos'
    },
    {
      titulo: 'Destaque de Vendas',
      descricao_detalhada: 'Melhore a descrição e as fotos do seu delivery para aumentar o ticket médio.',
      nivel_de_impacto: 'Baixo',
      pilar: 'Marketing e Destaque'
    }
  ];
}