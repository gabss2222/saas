'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  DollarSign, 
  Package, 
  Percent, 
  UtensilsCrossed, 
  TrendingUp, 
  TrendingDown,
  Menu,
  X,
  Calendar,
  ChevronDown,
  ChevronUp,
  History,
  Info,
  ArrowRight,
  Save,
  Trash2,
  RefreshCw,
  Sparkles,
  Target,
  Zap
} from 'lucide-react'
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'
import AIRecommendations from './components/AIRecommendations'

// Interface detalhada para o histórico
interface HistoricoItem {
  id: number
  nomePrato: string
  precoVenda: number
  lucroLiquido: number
  margemLucro: number
  custoIngredientes?: number
  taxaMarketplace?: number
  taxaMarketplaceValor?: number
  data: string
  created_at?: string
}

export default function Home() {
  // Estados do Formulário
  const [nomePrato, setNomePrato] = useState('')
  const [precoVenda, setPrecoVenda] = useState('')
  const [custoIngredientes, setCustoIngredientes] = useState('')
  const [taxaMarketplace, setTaxaMarketplace] = useState('')
  
  // Estados de Controle de UI
  const [sidebarAberto, setSidebarAberto] = useState(true)
  const [detalheAberto, setDetalheAberto] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [carregandoHistorico, setCarregandoHistorico] = useState(true)
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  const ultimoCalculoSalvo = useRef<string>('')

  // Função para formatar data (há X min)
  const formatarData = useCallback((dataString: string) => {
    if (!dataString) return ''
    const data = new Date(dataString)
    const agora = new Date()
    const diffMs = agora.getTime() - data.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Agora mesmo'
    if (diffMins < 60) return `Há ${diffMins} min`
    if (diffHours < 24) return `Há ${diffHours}h`
    if (diffDays === 1) return 'Ontem'
    return data.toLocaleDateString('pt-BR')
  }, [])

  // Função para formatar data completa nos detalhes
  const formatarDataCompleta = useCallback((dataString: string) => {
    if (!dataString) return ''
    const data = new Date(dataString)
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  // Busca dados no banco de dados (Supabase)
  const carregarHistorico = useCallback(async () => {
    setCarregandoHistorico(true)
    try {
      const { data, error } = await supabase
        .from('calculos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      if (data) {
        setHistorico(data.map((item: any) => ({
          id: item.id,
          nomePrato: item.nome_prato,
          precoVenda: item.preco_venda,
          lucroLiquido: item.lucro_liquido,
          margemLucro: item.margem_lucro,
          custoIngredientes: item.custo_ingredientes,
          taxaMarketplace: item.taxa_marketplace,
          taxaMarketplaceValor: item.taxa_marketplace_valor || (item.preco_venda * item.taxa_marketplace / 100),
          data: formatarData(item.created_at),
          created_at: item.created_at
        })))
      }
    } catch (error) {
      console.error('Erro ao buscar histórico:', error)
    } finally {
      setCarregandoHistorico(false)
    }
  }, [formatarData])

  useEffect(() => {
    carregarHistorico()
  }, [carregarHistorico])

  // Lógica de cálculo em tempo real
  const precoVendaNum = parseFloat(precoVenda) || 0
  const custoIngredientesNum = parseFloat(custoIngredientes) || 0
  const taxaMarketplaceNum = parseFloat(taxaMarketplace) || 0
  
  const taxaMarketplaceValor = (precoVendaNum * taxaMarketplaceNum) / 100
  const lucroLiquido = precoVendaNum - custoIngredientesNum - taxaMarketplaceValor
  const margemLucro = precoVendaNum > 0 ? (lucroLiquido / precoVendaNum) * 100 : 0

  // Dados do gráfico de pizza
  const dadosGrafico = [
    { name: 'Lucro Líquido', value: Math.max(0, lucroLiquido), cor: '#6366f1' },
    { name: 'Custo CMV', value: custoIngredientesNum, cor: '#e2e8f0' },
    { name: 'Taxas App', value: taxaMarketplaceValor, cor: '#94a3b8' }
  ].filter(item => item.value > 0)

  // Formatação de moeda brasileira
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  // Função para salvar manualmente
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomePrato.trim() || precoVendaNum <= 0) return

    setSalvando(true)
    try {
      const { error } = await supabase.from('calculos').insert([{
        nome_prato: nomePrato.trim(),
        preco_venda: precoVendaNum,
        custo_ingredientes: custoIngredientesNum,
        taxa_marketplace: taxaMarketplaceNum,
        lucro_liquido: lucroLiquido,
        margem_lucro: margemLucro
      }])

      if (error) throw error
      await carregarHistorico()
    } catch (error) {
      console.error('Erro ao salvar cálculo:', error)
    } finally {
      setSalvando(false)
    }
  }

  // Auto-save: salva automaticamente após 3 segundos de inatividade
  useEffect(() => {
    const autosave = async () => {
      if (!nomePrato.trim() || precoVendaNum <= 0 || custoIngredientesNum <= 0) return
      
      const hash = `${nomePrato}-${precoVendaNum}-${custoIngredientesNum}`
      if (ultimoCalculoSalvo.current === hash) return

      try {
        const { error } = await supabase.from('calculos').insert([{
          nome_prato: nomePrato.trim(),
          preco_venda: precoVendaNum,
          custo_ingredientes: custoIngredientesNum,
          taxa_marketplace: taxaMarketplaceNum,
          lucro_liquido: lucroLiquido,
          margem_lucro: margemLucro
        }])
        
        if (!error) {
          ultimoCalculoSalvo.current = hash
          carregarHistorico()
        }
      } catch (e) {
        console.error('Erro no autosave:', e)
      }
    }

    const timer = setTimeout(() => { autosave() }, 3000)
    return () => clearTimeout(timer)
  }, [nomePrato, precoVenda, custoIngredientes, taxaMarketplace, carregarHistorico, lucroLiquido, margemLucro, precoVendaNum, custoIngredientesNum, taxaMarketplaceNum])

  return (
    <div className="min-h-screen bg-[#fcfcfd] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Sidebar - MOBILE FIX: z-50 e translate-x */}
      <aside className={`fixed left-0 top-0 h-full bg-white shadow-2xl border-r border-slate-100 transition-all duration-500 z-50 ${
        sidebarAberto ? 'w-80 translate-x-0' : 'w-20 -translate-x-full md:translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            {sidebarAberto && (
              <div className="flex items-center gap-3 animate-fadeIn">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                  <TrendingUp className="text-white w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Analytics</h2>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">premium delivery</p>
                </div>
              </div>
            )}
            <button 
              onClick={() => setSidebarAberto(!sidebarAberto)}
              className="p-2.5 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-indigo-600"
            >
              {sidebarAberto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {sidebarAberto && (
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="flex items-center justify-between mb-6 px-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Últimas Análises</h3>
                <button onClick={carregarHistorico} className="p-1 hover:rotate-180 transition-all duration-500">
                  <RefreshCw className="w-3 h-3 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                {historico.map((item) => (
                  <div key={item.id} className="group bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:border-indigo-100 hover:shadow-md transition-all duration-300">
                    <div className="flex justify-between items-start mb-2">
                      <div className="max-w-[140px]">
                        <h4 className="font-bold text-sm text-slate-800 truncate">{item.nomePrato}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Calendar className="w-3 h-3 text-slate-300" />
                          <span className="text-[10px] font-medium text-slate-400">{item.data}</span>
                        </div>
                      </div>
                      <div className="px-2 py-1 rounded-lg text-[9px] font-black border bg-green-50 text-green-600 border-green-100">
                        {item.margemLucro.toFixed(0)}%
                      </div>
                    </div>

                    <div className="flex items-end justify-between mt-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lucro</p>
                        <p className="text-lg font-black text-green-600">
                          {formatarMoeda(item.lucroLiquido)}
                        </p>
                      </div>
                      <button 
                        onClick={() => setDetalheAberto(detalheAberto === item.id ? null : item.id)}
                        className="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all"
                      >
                        {detalheAberto === item.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {detalheAberto === item.id && (
                      <div className="mt-4 pt-4 border-t border-dashed border-slate-100 space-y-2 animate-slideDown">
                        <div className="flex justify-between text-[11px] font-medium">
                          <span className="text-slate-400">Preço Venda:</span>
                          <span className="text-slate-700 font-bold">{formatarMoeda(item.precoVenda)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-medium">
                          <span className="text-slate-400">CMV:</span>
                          <span className="text-red-500 font-bold">-{formatarMoeda(item.custoIngredientes || 0)}</span>
                        </div>
                        <div className="mt-2 bg-indigo-50 p-2 rounded-lg">
                          <p className="text-[9px] text-indigo-600 font-bold text-center">Data: {formatarDataCompleta(item.created_at || '')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Conteúdo Principal - MOBILE FIX: md:ml-80 */}
      <main className={`transition-all duration-500 p-4 md:p-10 ${sidebarAberto ? 'md:ml-80' : 'md:ml-20'}`}>
        <div className="max-w-6xl mx-auto">
          
          <header className="flex items-center gap-4 mb-12">
            {!sidebarAberto && (
              <button 
                onClick={() => setSidebarAberto(true)}
                className="p-4 bg-white shadow-xl rounded-2xl text-indigo-600 hover:scale-110 transition-all border border-slate-100 animate-fadeIn"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                Dashboard <span className="text-indigo-600">Pro</span>
              </h1>
              <p className="text-slate-500 font-medium mt-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Inteligência financeira para seu delivery
              </p>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <section className="md:col-span-2 lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 md:p-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 transition-all group-hover:scale-150 duration-700" />
              <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3 relative">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <UtensilsCrossed className="text-indigo-600 w-5 h-5" />
                </div>
                Nova Simulação
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6 relative">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Prato</label>
                  <input 
                    type="text" 
                    value={nomePrato}
                    onChange={(e) => setNomePrato(e.target.value)}
                    placeholder="Ex: Combo Smash Burger Duplo"
                    className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-900 font-bold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Preço Venda</label>
                    <input 
                      type="number" 
                      value={precoVenda}
                      onChange={(e) => setPrecoVenda(e.target.value)}
                      placeholder="0,00"
                      className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-900 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Custo Insumos</label>
                    <input 
                      type="number" 
                      value={custoIngredientes}
                      onChange={(e) => setCustoIngredientes(e.target.value)}
                      placeholder="0,00"
                      className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-900 font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Taxa Marketplace (%)</label>
                  <input 
                    type="number" 
                    value={taxaMarketplace}
                    onChange={(e) => setTaxaMarketplace(e.target.value)}
                    placeholder="12"
                    className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-900 font-bold"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={salvando}
                  className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {salvando ? 'PROCESSANDO...' : 'Salvar Cálculo'}
                </button>
              </form>
            </section>

            {/* Cards de Resultado */}
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all duration-500">
              <div>
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-6">
                  <DollarSign className="text-green-600 w-6 h-6" />
                </div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Lucro Líquido</h3>
                <p className={`text-5xl font-black tracking-tighter ${lucroLiquido >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                  {formatarMoeda(lucroLiquido)}
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 w-fit px-3 py-1.5 rounded-full">
                <TrendingUp className="w-4 h-4" />
                <span>Resultado por unidade</span>
              </div>
            </div>

            <div className="bg-indigo-600 p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-100 flex flex-col justify-between text-white hover:scale-[1.02] transition-all duration-500">
              <div>
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                  <Percent className="text-white w-6 h-6" />
                </div>
                <h3 className="text-sm font-black text-indigo-200 uppercase tracking-widest mb-2">Margem Real</h3>
                <p className="text-5xl font-black tracking-tighter">
                  {margemLucro.toFixed(1)}<span className="text-2xl text-indigo-300">%</span>
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold bg-white/10 w-fit px-3 py-1.5 rounded-full uppercase">
                {margemLucro >= 20 ? 'SAÚDE EXCELENTE' : 'REVISAR PREÇOS'}
              </div>
            </div>
          </div>

          {/* Segunda Linha: Gráfico e IA */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-xl font-black text-slate-800">Distribuição de Receita</h3>
                <Info className="text-slate-300 w-5 h-5 cursor-help" />
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosGrafico}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={8}
                      dataKey="value"
                      strokeWidth={0}
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {dadosGrafico.map((entry, index) => <Cell key={index} fill={entry.cor} className="outline-none" />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatarMoeda(Number(v) || 0)} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Seção da IA */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-8 border-b border-slate-50 bg-[#fafaff]">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                    <Sparkles className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Consultoria Profissional</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Análise por IA</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-8">
                <AIRecommendations 
                  lucroLiquido={lucroLiquido} 
                  margemLucro={margemLucro} 
                  nomePrato={nomePrato}
                  precoVenda={precoVendaNum}
                  custoIngredientes={custoIngredientesNum}
                  taxaMarketplace={taxaMarketplaceNum}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}