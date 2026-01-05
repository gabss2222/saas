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
    case 'Estratégia de Preço':
      return DollarSign
    case 'Otimização de Custos':
      return Package
    case 'Marketing e Destaque':
      return TrendingUp
    default:
      return AlertCircle
  }
}

const getImpactoBadgeStyles = (nivel: string) => {
  switch (nivel) {
    case 'Alto':
      return 'bg-red-100 text-red-700 border-red-300'
    case 'Médio':
      return 'bg-yellow-100 text-yellow-700 border-yellow-300'
    case 'Baixo':
      return 'bg-blue-100 text-blue-700 border-blue-300'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300'
  }
}

const getPilarBadgeStyles = (pilar: string) => {
  switch (pilar) {
    case 'Estratégia de Preço':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    case 'Otimização de Custos':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'Marketing e Destaque':
      return 'bg-purple-50 text-purple-700 border-purple-200'
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200'
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
    // Validar se tem dados válidos
    if (precoVenda <= 0 || (lucroLiquido === 0 && margemLucro === 0)) {
      setError('Preencha os dados necessários para gerar a análise')
      return
    }

    setLoading(true)
    setError(null)
    setHasGenerated(true)

    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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
        setError('Limite de consultas atingido. Tente novamente em alguns segundos.')
        setHasGenerated(false)
        return
      }

      if (!response.ok) {
        throw new Error('Erro ao buscar recomendações')
      }

      const data = await response.json()
      setRecommendations(data.recommendations || [])
    } catch (err) {
      console.error('Erro ao buscar recomendações:', err)
      setError('Não foi possível carregar recomendações')
      setHasGenerated(false)
    } finally {
      setLoading(false)
    }
  }

  // Skeleton screen melhorado enquanto carrega
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-6 h-6 text-indigo-600 animate-pulse" />
          <h3 className="text-xl font-bold text-slate-900">Consultoria Profissional</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Realizando análise profunda dos dados...</span>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                  <div className="space-y-2">
                    <div className="h-5 bg-slate-200 rounded w-48"></div>
                    <div className="h-4 bg-slate-200 rounded w-24"></div>
                  </div>
                </div>
                <div className="h-6 bg-slate-200 rounded-full w-16"></div>
              </div>
              <div className="space-y-2 mt-4">
                <div className="h-4 bg-slate-200 rounded w-full"></div>
                <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                <div className="h-4 bg-slate-200 rounded w-4/6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Se não tiver dados válidos, não mostrar nada
  if (precoVenda <= 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-6 h-6 text-indigo-600" />
          <h3 className="text-xl font-bold text-slate-900">Consultoria Profissional</h3>
        </div>
        <p className="text-sm text-slate-400 text-center py-8">
          Preencha os dados para receber análises profissionais personalizadas
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-600" />
          <h3 className="text-xl font-bold text-slate-900">Consultoria Profissional</h3>
        </div>
      </div>
      
      {error && (
        <div className={`text-sm p-3 rounded-lg border ${
          error.includes('Limite de consultas') 
            ? 'text-orange-700 bg-orange-50 border-orange-200' 
            : 'text-amber-600 bg-amber-50 border-amber-200'
        }`}>
          {error}
        </div>
      )}

      {!hasGenerated && !loading && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Brain className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-semibold text-slate-900 mb-2">
                Análise Profissional Personalizada
              </h4>
              <p className="text-sm text-slate-600 mb-4">
                Clique no botão abaixo para gerar uma análise estratégica completa baseada nos seus dados financeiros.
              </p>
              <button
                onClick={handleGenerateAnalysis}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                Gerar Análise Profissional
              </button>
            </div>
          </div>
        </div>
      )}

      {recommendations.length > 0 ? (
        <div className="space-y-4">
          {recommendations.map((recommendation, index) => {
            const Icon = getPilarIcon(recommendation.pilar)
            const impactoStyles = getImpactoBadgeStyles(recommendation.nivel_de_impacto)
            const pilarStyles = getPilarBadgeStyles(recommendation.pilar)

            return (
              <div
                key={index}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
              >
                <div className="p-5">
                  {/* Header do Card */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                        <Icon className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-slate-900 mb-2 leading-tight">
                          {recommendation.titulo}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${pilarStyles}`}>
                            {recommendation.pilar}
                          </span>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${impactoStyles}`}>
                            Impacto: {recommendation.nivel_de_impacto}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Descrição Detalhada */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {recommendation.descricao_detalhada}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-400 text-center py-8">
          Nenhuma recomendação disponível
        </p>
      )}
    </div>
  )
}
