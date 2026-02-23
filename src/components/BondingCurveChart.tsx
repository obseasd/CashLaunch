"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface Props {
  basePrice: number;
  slope: number;
  totalSupply: number;
  currentSold?: number; // tokens already sold from contract
}

export default function BondingCurveChart({
  basePrice,
  slope,
  totalSupply,
  currentSold = 0,
}: Props) {
  // Generate price curve data points
  const points = 100;
  const step = totalSupply / points;
  const data = Array.from({ length: points + 1 }, (_, i) => {
    const tokensSold = Math.round(i * step);
    const tokensInContract = totalSupply - tokensSold;
    const price = basePrice + slope * tokensInContract;
    return {
      sold: tokensSold,
      price,
    };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0AC18E" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#0AC18E" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis
          dataKey="sold"
          stroke="#4b5563"
          fontSize={11}
          tickFormatter={(v) =>
            v >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v
          }
          label={{ value: "Tokens Sold", position: "insideBottom", offset: -2, fill: "#6b7280", fontSize: 11 }}
        />
        <YAxis
          stroke="#4b5563"
          fontSize={11}
          tickFormatter={(v) => `${v}`}
          label={{ value: "Price (sats)", angle: -90, position: "insideLeft", fill: "#6b7280", fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          labelFormatter={(v) => `${Number(v).toLocaleString()} tokens sold`}
          formatter={(value) => [`${value} sats`, "Price"]}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke="#0AC18E"
          strokeWidth={2}
          fill="url(#priceGradient)"
        />
        {currentSold > 0 && (
          <ReferenceLine
            x={currentSold}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{
              value: "Current",
              position: "top",
              fill: "#f59e0b",
              fontSize: 11,
            }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
