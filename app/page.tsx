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
  RefreshCw
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

// Definição da Interface para o Histórico
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
  // Estados para o Formulário
  const [nomePrato, setNomePrato] = useState('')
  const [precoVenda, setPrecoVenda] = useState('')
  const [custoIngredientes, setCustoIngredientes] = useState('')
  const [taxaMarketplace, setTaxaMarketplace] = useState('')
  
  // Estados de UI
  const [sidebarAberto, setSidebarAberto] = useState(true)
  const [detalheAberto, setDetalheAberto] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [carregandoHistorico, setCarregandoHistorico] = useState(true)
  
  // Estados de Dados
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  const ultimoCalculoSalvo = useRef<string>('')

  // Função para formatar data relativa (ex: há 2 min)
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

  // Função para formatar data completa para os detalhes
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

  // Carregar dados do Supabase
  const carregarHistorico = useCallback(async () => {
    setCarregandoHistorico(true)
    try {
      const { data, error } = await supabase
        .from('calculos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15)

      if (error) throw error

      if (data) {
        const historicoFormatado = data.map((item: any) => ({
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
        }))
        setHistorico(historicoFormatado)
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
    } finally {
      setCarregandoHistorico(false)
    }
  }, [formatarData])

  // Efeito Inicial
  useEffect(() => {
    carregarHistorico()
  }, [carregarHistorico])

  // Cálculos em Tempo Real
  const precoVendaNum = parseFloat(precoVenda) || 0
  const custoIngredientesNum = parseFloat(custoIngredientes) || 0
  const taxaMarketplaceNum = parseFloat(taxaMarketplace) || 0
  
  const taxaMarketplaceValor = (precoVendaNum * taxaMarketplaceNum) / 100
  const lucroLiquido = precoVendaNum - custoIngredientesNum - taxaMarketplaceValor
  const margemLucro = precoVendaNum > 0 ? (lucroLiquido / precoVendaNum) * 100 : 0

  // Dados para o Gráfico de Pizza
  const dadosGrafico = [
    { name: 'Lucro Líquido', value: Math.max(0, lucroLiquido), cor: '#10b981' },
    { name: 'Custo CMV', value: custoIngredientesNum, cor: '#ef4444' },
    { name: 'Taxas App', value: taxaMarketplaceValor, cor: '#f59e0b' }
  ].filter(item => item.value > 0)

  // Funções de Formatação
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  // Função de Salvamento Manual
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nomePrato.trim() || precoVendaNum <= 0) {
      alert('Preencha os dados corretamente para salvar.')
      return
    }

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
      
      // Limpar campos se desejar
      // setNomePrato(''); setPrecoVenda('');
      
      await carregarHistorico()
    } catch (error) {
      console.error('Erro ao salvar:', error)
    } finally {
      setSalvando(false)
    }
  }

  // CORREÇÃO DA LINHA 266: Lógica de Auto-save corrigida
  useEffect(() => {
    const autosave = async () => {
      if (!nomePrato.trim() || precoVendaNum <= 0 || custoIngredientesNum <= 0) return
      
      const hash = `${nomePrato}-${precoVendaNum}-${custoIngredientesNum}-${taxaMarketplaceNum}`
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

    const timer = setTimeout(() => {
      autosave()
    }, 3000)

    return () => clearTimeout(timer)
  }, [nomePrato, precoVenda, custoIngredientes, taxaMarketplace, carregarHistorico, lucroLiquido, margemLucro, precoVendaNum, custoIngredientesNum, taxaMarketplaceNum])

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Sidebar - MOBILE FIX: z-50 e translate-x */}
      <aside className={`fixed left-0 top-0 h-full bg-white shadow-2xl border-r border-slate-200 transition-all duration-500 z-50 ${
        sidebarAberto ? 'w-80 translate-x-0' : 'w-20 -translate-x-full md:translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            {sidebarAberto && (
              <div className="flex items-center gap-3 animate-fadeIn">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                  <TrendingUp className="text-white w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Analytics</h2>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Premium SaaS</p>
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

          {/* Histórico na Sidebar */}
          {sidebarAberto && (
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="flex items-center justify-between mb-6 px-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Últimas Análises</h3>
                <button onClick={carregarHistorico} className="p-1 hover:rotate-180 transition-all duration-500">
                  <RefreshCw className="w-3 h-3 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                {carregandoHistorico && historico.length === 0 ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-50 rounded-2xl animate-pulse" />)}
                  </div>
                ) : historico.map((item) => (
                  <div key={item.id} className="group bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all duration-300">
                    <div className="flex justify-between items-start mb-2">
                      <div className="max-w-[140px]">
                        <h4 className="font-bold text-sm text-slate-800 truncate">{item.nomePrato}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Calendar className="w-3 h-3 text-slate-300" />
                          <span className="text-[10px] font-medium text-slate-400">{item.data}</span>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-lg text-[9px] font-black border ${
                        item.margemLucro >= 25 ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {item.margemLucro.toFixed(0)}%
                      </div>
                    </div>

                    <div className="flex items-end justify-between mt-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lucro</p>
                        <p className={`text-lg font-black ${item.lucroLiquido >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
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
                          <span className="text-slate-700">{formatarMoeda(item.precoVenda)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-medium">
                          <span className="text-slate-400">CMV:</span>
                          <span className="text-red-500">-{formatarMoeda(item.custoIngredientes || 0)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-medium">
                          <span className="text-slate-400 text-xs">Taxas App:</span>
                          <span className="text-red-500">-{formatarMoeda(item.taxaMarketplaceValor || 0)}</span>
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
          
          {/* Header com Botão de Reabrir Menu (Aparece se Sidebar fechada) */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="flex items-center gap-4">
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
            </div>
          </header>

          {/* Grid Principal - Bento Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            
            {/* Card 1: Calculadora - Ocupa 2 colunas */}
            <section className="md:col-span-2 lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-200/60 p-8 md:p-10 relative overflow-hidden group">
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
                    className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-900 font-bold placeholder:text-slate-300"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Preço Venda</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                      <input 
                        type="number" 
                        value={precoVenda}
                        onChange={(e) => setPrecoVenda(e.target.value)}
                        placeholder="0,00"
                        className="w-full p-5 pl-12 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-900 font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Custo Insumos</label>
                    <div className="relative">
                      <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                      <input 
                        type="number" 
                        value={custoIngredientes}
                        onChange={(e) => setCustoIngredientes(e.target.value)}
                        placeholder="0,00"
                        className="w-full p-5 pl-12 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-900 font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Taxa Marketplace (%)</label>
                  <div className="relative">
                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                    <input 
                      type="number" 
                      value={taxaMarketplace}
                      onChange={(e) => setTaxaMarketplace(e.target.value)}
                      placeholder="12"
                      className="w-full p-5 pl-12 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-900 font-bold"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={salvando}
                  className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {salvando ? <RefreshCw className="animate-spin" /> : <Save />}
                  {salvando ? 'PROCESSANDO...' : 'SALVAR NO SUPABASE'}
                </button>
              </form>
            </section>

            {/* Card 2: Lucro Líquido */}
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-sm flex flex-col justify-between hover:shadow-xl hover:shadow-green-500/5 transition-all duration-500">
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

            {/* Card 3: Margem Real */}
            <div className="bg-indigo-600 p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-200 flex flex-col justify-between text-white hover:scale-[1.02] transition-all duration-500">
              <div>
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                  <Percent className="text-white w-6 h-6" />
                </div>
                <h3 className="text-sm font-black text-indigo-200 uppercase tracking-widest mb-2">Margem Real</h3>
                <p className="text-5xl font-black tracking-tighter">
                  {margemLucro.toFixed(1)}<span className="text-2xl text-indigo-300">%</span>
                </p>
              </div>
              <div className={`mt-8 flex items-center gap-2 text-xs font-bold w-fit px-3 py-1.5 rounded-full ${
                margemLucro >= 20 ? 'bg-white/10 text-white' : 'bg-red-500/20 text-red-200'
              }`}>
                {margemLucro >= 20 ? 'SAÚDE EXCELENTE' : 'REVISAR PREÇOS'}
              </div>
            </div>

          </div>

          {/* Segunda Linha - Gráfico e IA */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Gráfico */}
            <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-xl font-black text-slate-800">Composição do Prato</h3>
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
                      {dadosGrafico.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} className="hover:opacity-80 transition-all outline-none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(v: any) => formatarMoeda(Number(v) || 0)}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Componente de IA */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
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
      </main>
    </div>
  )
}