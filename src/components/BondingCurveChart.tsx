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
  currentSold?: number;
}

function formatAxis(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return `${v}`;
}

export default function BondingCurveChart({
  basePrice,
  slope,
  totalSupply,
  currentSold = 0,
}: Props) {
  const points = 100;
  const step = totalSupply / points;
  const data = Array.from({ length: points + 1 }, (_, i) => {
    const tokensSold = Math.round(i * step);
    // Ascending bonding curve: price increases as more tokens are sold
    const price = basePrice + slope * tokensSold;
    return { sold: tokensSold, price };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 5, bottom: 0 }}>
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#12c89f" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#12c89f" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2030" vertical={false} />
        <XAxis
          dataKey="sold"
          stroke="#4a4c5e"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatAxis}
        />
        <YAxis
          stroke="#4a4c5e"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatAxis}
          width={55}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#141520",
            border: "1px solid #1e2030",
            borderRadius: "12px",
            fontSize: "12px",
            padding: "8px 12px",
          }}
          labelStyle={{ color: "#8b8da0", fontSize: "11px" }}
          itemStyle={{ color: "#12c89f" }}
          labelFormatter={(v) => `${Number(v).toLocaleString()} tokens sold`}
          formatter={(value) => [`${Number(value).toLocaleString()} sats`, "Price"]}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke="#12c89f"
          strokeWidth={2}
          fill="url(#chartGradient)"
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
              fontSize: 10,
            }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
