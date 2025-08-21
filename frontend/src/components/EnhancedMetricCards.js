// Enhanced Metric Cards for SwingAlyze
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function EnhancedMetricCards({ metrics, previousMetrics = null }) {
  const getTrendIcon = (current, previous) => {
    if (!previous) return null;
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = (current, previous) => {
    if (!previous) return 'text-gray-700';
    if (current > previous) return 'text-green-600';
    if (current < previous) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((metric, i) => {
        const prevValue = previousMetrics?.[i]?.numericValue;
        const trendIcon = getTrendIcon(metric.numericValue, prevValue);
        const trendColor = getTrendColor(metric.numericValue, prevValue);
        
        return (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <div className="text-sm font-medium text-gray-600">{metric.label}</div>
              {trendIcon}
            </div>
            
            <div className={`text-2xl font-bold mb-1 ${trendColor}`}>
              {metric.value}
            </div>
            
            {metric.hint && (
              <div className="text-xs text-gray-500">{metric.hint}</div>
            )}
            
            {metric.status && (
              <div className={`text-xs font-medium mt-2 ${
                metric.status === 'good' ? 'text-green-600' :
                metric.status === 'poor' ? 'text-red-600' : 'text-yellow-600'
              }`}>
                {metric.status === 'good' ? '✓ Excellent' :
                 metric.status === 'poor' ? '⚠ Needs Work' : '◯ Average'}
              </div>
            )}
            
            {previousMetrics && prevValue !== undefined && (
              <div className="text-xs text-gray-500 mt-1">
                {metric.numericValue > prevValue ? '+' : ''}{(metric.numericValue - prevValue).toFixed(1)} from last
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}