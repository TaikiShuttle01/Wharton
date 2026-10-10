/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DataState, FundamentalClassification } from '../../types/quantTypes';
import { getDataStateBadgeStyle, getFundamentalClassBadge } from '../../utils/formatters';

interface StatusBadgeProps {
  state: DataState;
  showDot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  state,
  showDot = true,
  className = '',
}) => {
  const style = getDataStateBadgeStyle(state);

  return (
    <span
      title={style.description}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono tracking-tight uppercase border rounded-xs transition-colors ${style.bgClass} ${style.textClass} ${style.borderClass} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${style.dotClass}`} />}
      {style.label}
    </span>
  );
};

export const FundamentalBadge: React.FC<{
  classification: FundamentalClassification;
  className?: string;
}> = ({ classification, className = '' }) => {
  const info = getFundamentalClassBadge(classification);
  return (
    <span
      title={info.desc}
      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono tracking-tight uppercase border rounded-xs ${info.badgeClass} ${className}`}
    >
      {info.label}
    </span>
  );
};
