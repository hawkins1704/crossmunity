import {
    PieChart,
    Pie,
    Cell,
    Legend,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

interface ServiceDistributionData {
    service: string;
    count: number;
}

interface ServiceDistributionChartProps {
    data: ServiceDistributionData[];
}

const COLORS = [
    "#3B82F6", // Azul
    "#10B981", // Verde
    "#F59E0B", // Naranja
    "#8B5CF6", // Púrpura
];

export default function ServiceDistributionChart({
    data,
}: ServiceDistributionChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-[#666666]">
                <p className="text-sm">No hay datos disponibles</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({  percent }) =>
                        ` ${(percent * 100).toFixed(1)}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="service"
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                        />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e5e5",
                        borderRadius: "4px",
                    }}
                    formatter={(value: number) => [
                        `${value} ${value === 1 ? "persona" : "personas"}`,
                        "",
                    ]}
                />
                <Legend
                    formatter={(value, entry: any) => (
                        <span style={{ color: entry.color }}>
                            {entry.payload.service}: {entry.payload.count}
                        </span>
                    )}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
