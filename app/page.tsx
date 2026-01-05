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
  ChevronUp
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import AIRecommendations from './components/AIRecommendations'

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
  const [nomePrato, setNomePrato] = useState('')
  const [precoVenda, setPrecoVenda] = useState('')
  const [custoIngredientes, setCustoIngredientes] = useState('')
  const [taxaMarketplace, setTaxaMarketplace] = useState('')
  const [insightsVisivel, setInsightsVisivel] = useState(false)
  const [sidebarAberto, setSidebarAberto] = useState(true)
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  const [salvando, setSalvando] = useState(false)
  const [detalheAberto, setDetalheAberto] = useState<number | null>(null)
  const ultimoCalculoSalvo = useRef<string>('')

  const formatarData = useCallback((dataString: string) => {
    if (!dataString) return ''
    const data = new Date(dataString)
    const agora = new Date()
    const diffMs = agora.getTime() - data.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Agora'
    if (diffMins < 60) return `${diffMins} min atrás`
    if (diffHours < 24) return `${diffHours}h atrás`
    if (diffDays === 1) return 'Ontem'
    if (diffDays < 7) return `${diffDays} dias atrás`
    
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

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

  const carregarHistorico = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('calculos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

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
      console.error('Erro ao carregar histórico:', error)
    }
  }, [formatarData])

  useEffect(() => {
    carregarHistorico()
  }, [carregarHistorico])

  // Calcula os valores
  const precoVendaNum = parseFloat(precoVenda) || 0
  const custoIngredientesNum = parseFloat(custoIngredientes) || 0
  const taxaMarketplaceNum = parseFloat(taxaMarketplace) || 0
  
  const taxaMarketplaceValor = (precoVendaNum * taxaMarketplaceNum) / 100
  const lucroLiquido = precoVendaNum - custoIngredientesNum - taxaMarketplaceValor
  const lucroFinal = lucroLiquido
  const margemLucro = precoVendaNum > 0 ? (lucroFinal / precoVendaNum) * 100 : 0

  // Dados para o gráfico de pizza
  const dadosGrafico = [
    { name: 'Lucro', value: Math.max(0, lucroFinal), cor: '#10b981' },
    { name: 'Custo Ingredientes', value: custoIngredientesNum, cor: '#ef4444' },
    { name: 'Taxa Marketplace', value: taxaMarketplaceValor, cor: '#f59e0b' }
  ].filter(item => item.value > 0)

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  const formatarPercentual = (valor: number) => {
    return `${valor.toFixed(2)}%`
  }

  const gerarInsights = () => {
    setInsightsVisivel(true)
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }

    if (!nomePrato.trim() || !precoVenda || !custoIngredientes || !taxaMarketplace) {
      alert('Por favor, preencha todos os campos!')
      return
    }

    const precoVendaNum = parseFloat(precoVenda)
    const custoIngredientesNum = parseFloat(custoIngredientes)
    const taxaMarketplaceNum = parseFloat(taxaMarketplace)

    if (precoVendaNum <= 0 || custoIngredientesNum < 0 || taxaMarketplaceNum < 0) {
      alert('Por favor, insira valores válidos!')
      return
    }

    const taxaMarketplaceValor = (precoVendaNum * taxaMarketplaceNum) / 100
    const lucroFinal = precoVendaNum - custoIngredientesNum - taxaMarketplaceValor
    const margemLucro = precoVendaNum > 0 ? (lucroFinal / precoVendaNum) * 100 : 0

    setSalvando(true)

    try {
      const dadosParaSalvar = {
        nome_prato: nomePrato.trim(),
        preco_venda: precoVendaNum,
        custo_ingredientes: custoIngredientesNum,
        taxa_marketplace: taxaMarketplaceNum,
        lucro_liquido: lucroFinal,
        margem_lucro: margemLucro
      }

      const { data, error } = await supabase
        .from('calculos')
        .insert([dadosParaSalvar])
        .select()

      if (error) {
        console.error('Erro do Supabase:', error)
        alert(`Erro ao salvar: ${error.message}`)
        throw error
      }

      if (data && data.length > 0) {
        carregarHistorico()
      }
    } catch (error) {
      console.error('Erro ao salvar cálculo:', error)
      alert('Erro ao salvar os dados. Verifique o console para mais detalhes.')
    } finally {
      setSalvando(false)
    }
  }

  useEffect(() => {
    const salvarCalculo = async () => {
      if (!nomePrato.trim() || !precoVenda || !custoIngredientes || !taxaMarketplace) {
        return
      }

      const precoVendaNum = parseFloat(precoVenda)
      const custoIngredientesNum = parseFloat(custoIngredientes)
      const taxaMarketplaceNum = parseFloat(taxaMarketplace)

      if (precoVendaNum <= 0 || custoIngredientesNum < 0 || taxaMarketplaceNum < 0) {
        return
      }

      const chaveCalculo = `${nomePrato}-${precoVenda}-${custoIngredientes}-${taxaMarketplace}`
      
      if (ultimoCalculoSalvo.current === chaveCalculo) {
        return
      }

      const taxaMarketplaceValor = (precoVendaNum * taxaMarketplaceNum) / 100
      const lucroFinal = precoVendaNum - custoIngredientesNum - taxaMarketplaceValor
      const margemLucro = precoVendaNum > 0 ? (lucroFinal / precoVendaNum) * 100 : 0

      setSalvando(true)

      try {
        const dadosParaSalvar = {
          nome_prato: nomePrato.trim(),
          preco_venda: precoVendaNum,
          custo_ingredientes: custoIngredientesNum,
          taxa_marketplace: taxaMarketplaceNum,
          lucro_liquido: lucroFinal,
          margem_lucro: margemLucro
        }

        const { data, error } = await supabase
          .from('calculos')
          .insert([dadosParaSalvar])
          .select()

        if (error) {
          console.error('Erro no salvamento automático:', error)
          throw error
        }

        if (data && data.length > 0) {
          ultimoCalculoSalvo.current = chaveCalculo
          carregarHistorico()
        }
      } catch (error) {
        console.error('Erro ao salvar cálculo:', error)
      } finally {
        setSalvando(false)
      }
    }

    const timeoutId = setTimeout(() => {
      salvando ? null : salvarCalculo()
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [nomePrato, precoVenda, custoIngredientes, taxaMarketplace, carregarHistorico, salvando])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full bg-white shadow-xl border-r border-slate-200 transition-all duration-300 z-30 ${
        sidebarAberto ? 'w-80' : 'w-20'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header da Sidebar */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              {sidebarAberto && (
                <div>
                  <h2 className="text-xl font-bold text-indigo-600">
                    Analytics Pro
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">Consultoria Premium</p>
                </div>
              )}
              <button
                onClick={() => setSidebarAberto(!sidebarAberto)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                aria-label="Toggle sidebar"
              >
                {sidebarAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Conteúdo da Sidebar */}
          {sidebarAberto && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                  Histórico de Cálculos
                </h3>
                <div className="space-y-3">
                  {historico.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      Nenhum cálculo ainda
                    </div>
                  ) : (
                    historico.map((item) => {
                      const lucroBom = item.lucroLiquido >= 0 && item.margemLucro >= 20
                      const tagCor = lucroBom ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                      
                      return (
                        <div
                          key={item.id}
                          className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-indigo-300"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-semibold text-sm text-slate-900">{item.nomePrato}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${tagCor}`}>
                              {lucroBom ? 'Bom' : 'Ruim'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                            <Calendar className="w-3 h-3" />
                            <span>{item.created_at ? formatarDataCompleta(item.created_at) : item.data}</span>
                          </div>
                          
                          <div className="space-y-2 mb-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-600">Lucro Líquido</span>
                              <span className={`text-sm font-bold ${lucroBom ? 'text-green-600' : 'text-red-600'}`}>
                                {formatarMoeda(item.lucroLiquido)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-600">Margem</span>
                              <span className={`text-xs font-semibold ${lucroBom ? 'text-green-600' : 'text-red-600'}`}>
                                {formatarPercentual(item.margemLucro)}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => setDetalheAberto(detalheAberto === item.id ? null : item.id)}
                            className="w-full flex items-center justify-center gap-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 py-2 rounded-lg transition-colors"
                          >
                            {detalheAberto === item.id ? (
                              <>
                                <ChevronUp className="w-4 h-4" />
                                Ocultar Detalhes
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" />
                                Ver Detalhes
                              </>
                            )}
                          </button>

                          {detalheAberto === item.id && (
                            <div className="mt-3 pt-3 border-t border-slate-200 space-y-2 animate-fadeIn">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Preço de Venda:</span>
                                <span className="text-slate-900 font-medium">{formatarMoeda(item.precoVenda)}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Custo Ingredientes:</span>
                                <span className="text-red-600 font-medium">{formatarMoeda(item.custoIngredientes || 0)}</span>
                              </div>
                              {item.taxaMarketplace !== undefined && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-500">Taxa Marketplace ({item.taxaMarketplace}%):</span>
                                  <span className="text-red-600 font-medium">
                                    -{formatarMoeda(item.taxaMarketplaceValor || 0)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className={`transition-all duration-300 ${sidebarAberto ? 'ml-80' : 'ml-20'}`}>
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Dashboard de Análise
            </h1>
            <p className="text-slate-600">Monitore e otimize a rentabilidade dos seus pratos</p>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Card 1: Formulário - Ocupa 2 colunas */}
            <div className="md:col-span-2 lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-indigo-600" />
                Nova Análise
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="nomePrato" className="block text-sm font-semibold text-slate-700 mb-2">
                    Nome do Prato
                  </label>
                  <div className="relative">
                    <UtensilsCrossed className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      id="nomePrato"
                      value={nomePrato}
                      onChange={(e) => setNomePrato(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all bg-white text-slate-900"
                      placeholder="Ex: Pizza Margherita"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="precoVenda" className="block text-sm font-semibold text-slate-700 mb-2">
                      Preço de Venda (R$)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="number"
                        id="precoVenda"
                        value={precoVenda}
                        onChange={(e) => setPrecoVenda(e.target.value)}
                        step="0.01"
                        min="0"
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all bg-white text-slate-900"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="custoIngredientes" className="block text-sm font-semibold text-slate-700 mb-2">
                      Custo dos Ingredientes - CMV (R$)
                    </label>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="number"
                        id="custoIngredientes"
                        value={custoIngredientes}
                        onChange={(e) => setCustoIngredientes(e.target.value)}
                        step="0.01"
                        min="0"
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all bg-white text-slate-900"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="taxaMarketplace" className="block text-sm font-semibold text-slate-700 mb-2">
                    Taxa do Marketplace (%)
                  </label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="number"
                      id="taxaMarketplace"
                      value={taxaMarketplace}
                      onChange={(e) => setTaxaMarketplace(e.target.value)}
                      step="0.1"
                      min="0"
                      max="100"
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all bg-white text-slate-900"
                      placeholder="0.0"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={salvando}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {salvando ? 'Salvando...' : 'Salvar Cálculo'}
                </button>
              </form>
            </div>

            {/* Card 2: Lucro Líquido */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Lucro Líquido</h3>
                {lucroFinal >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
              </div>
              <p className={`text-4xl font-bold ${lucroFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatarMoeda(lucroFinal)}
              </p>
            </div>

            {/* Card 3: Margem de Lucro */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Margem de Lucro</h3>
                {margemLucro >= 20 ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
              </div>
              <p className={`text-4xl font-bold ${margemLucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatarPercentual(margemLucro)}
              </p>
            </div>
          </div>

          {/* Segunda linha do Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Card 4: Gráfico de Pizza - Ocupa 2 colunas */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Distribuição de Receita</h2>
              {dadosGrafico.length > 0 && precoVendaNum > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosGrafico}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {dadosGrafico.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.cor} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatarMoeda(value)}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-slate-400">
                  Preencha os campos para ver o gráfico
                </div>
              )}
            </div>

            {/* Card 5: Recomendações da IA */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <AIRecommendations
                lucroLiquido={lucroFinal}
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