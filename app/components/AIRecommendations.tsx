'use client'

import { useState } from 'react'
import { Sparkles, Loader2, DollarSign, Package, TrendingUp, AlertCircle, Brain } from 'lucide-react'

interface Recommendation {
  titulo: string
  descricao_detalhada: string
  nivel_de_impacto: 'Alto' | 'Médio' | 'Baixo'
  pilar: 'Estratégia de Preço' | 'Otimização de Custos' | 'Marketing e Destaque'
}

interface AIRecommendationsProps {
  lucroLiquido: number
  margemLucro: number
  nomePrato?: string
  precoVenda?: number
  custoIngredientes?: number
  taxaMarketplace?: number
}

const getPilarIcon = (pilar: string) => {
  switch (pilar) {
    case 'Estratégia de Preço': return DollarSign
    case 'Otimização de Custos': return Package
    case 'Marketing e Destaque': return TrendingUp
    default: return AlertCircle
  }
}

const getImpactoBadgeStyles = (nivel: string) => {
  switch (nivel) {
    case 'Alto': return 'bg-red-100 text-red-700 border-red-300'
    case 'Médio': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
    case 'Baixo': return 'bg-blue-100 text-blue-700 border-blue-300'
    default: return 'bg-slate-100 text-slate-700 border-slate-300'
  }
}

const getPilarBadgeStyles = (pilar: string) => {
  switch (pilar) {
    case 'Estratégia de Preço': return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    case 'Otimização de Custos': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'Marketing e Destaque': return 'bg-purple-50 text-purple-700 border-purple-200'
    default: return 'bg-slate-50 text-slate-700 border-slate-200'
  }
}

export default function AIRecommendations({
  lucroLiquido,
  margemLucro,
  nomePrato = '',
  precoVenda = 0,
  custoIngredientes = 0,
  taxaMarketplace = 0
}: AIRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)

  const handleGenerateAnalysis = async () => {
    if (precoVenda <= 0) {
      setError('Preencha os dados do prato primeiro')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lucroLiquido,
          margemLucro,
          nomePrato,
          precoVenda,
          custoIngredientes,
          taxaMarketplace
        })
      })

      if (response.status === 429) {
        setError('Muitas consultas! Aguarde um pouco.')
        return
      }

      if (!response.ok) throw new Error('Falha na análise')

      const data = await response.json()
      setRecommendations(data.recommendations || [])
      setHasGenerated(true)
    } catch (err) {
      setError('Erro ao conectar com a IA profissional')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header - FIX: Ícone Sparkles protegido contra cortes */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-black text-slate-900 leading-tight truncate">Consultoria Profissional</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Analytics premium delivery</p>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-xl animate-shake">
          {error}
        </div>
      )}

      {!hasGenerated && !loading && (
        <div className="p-6 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-[2rem] border border-indigo-100 text-center">
          <Brain className="w-8 h-8 text-indigo-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-800 mb-2">Pronto para a Consultoria?</h4>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            Nossa IA analisará sua margem de <b>{margemLucro.toFixed(1)}%</b> para sugerir melhorias reais no seu lucro.
          </p>
          <button
            onClick={handleGenerateAnalysis}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            GERAR CONSULTORIA AGORA
          </button>
        </div>
      )}

      {loading && (
        <div className="py-10 text-center space-y-4">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Processando Inteligência...</p>
        </div>
      )}

      {hasGenerated && recommendations.length > 0 && (
        <div className="space-y-4 animate-fadeIn">
          {recommendations.map((rec, index) => {
            const Icon = getPilarIcon(rec.pilar)
            return (
              <div key={index} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${getPilarBadgeStyles(rec.pilar)}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h5 className="font-bold text-slate-800 text-sm leading-tight">{rec.titulo}</h5>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">{rec.descricao_detalhada}</p>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded-md text-[9px] font-black border uppercase ${getImpactoBadgeStyles(rec.nivel_de_impacto)}`}>
                    Impacto {rec.nivel_de_impacto}
                  </span>
                </div>
              </div>
            )
          })}
          <button 
            onClick={() => setHasGenerated(false)} 
            className="w-full py-3 text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors"
          >
            Nova Análise
          </button>
        </div>
      )}
    </div>
  )
}