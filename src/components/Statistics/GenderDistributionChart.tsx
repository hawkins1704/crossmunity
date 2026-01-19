import {
    PieChart,
    Pie,
    Cell,
    Legend,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

interface GenderDistributionData {
    male: number;
    female: number;
}

interface GenderDistributionChartProps {
    data: GenderDistributionData;
}

const COLORS = {
    male: "#3B82F6", // Azul
    female: "#EC4899", // Rosa
};

export default function GenderDistributionChart({
    data,
}: GenderDistributionChartProps) {
    if (!data || (data.male === 0 && data.female === 0)) {
        return (
            <div className="flex items-center justify-center h-64 text-[#666666]">
                <p className="text-sm">No hay datos disponibles</p>
            </div>
        );
    }

    const chartData = [
        { name: "Hombres", value: data.male, color: COLORS.male },
        { name: "Mujeres", value: data.female, color: COLORS.female },
    ].filter((item) => item.value > 0); // Solo mostrar categorías con datos

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                        `${name}: ${percent !== undefined ? (percent * 100).toFixed(1) : "0"}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                >
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e5e5",
                        borderRadius: "4px",
                    }}
                    formatter={(value: number | undefined) => [
                        `${value} ${value === 1 ? "persona" : "personas"}`,
                        "",
                    ]}
                />
                <Legend
                    formatter={(value, entry?: { color?: string; payload?: { value?: number } }) => (
                        <span style={{ color: entry?.color }}>
                            {value}: {entry?.payload?.value ?? 0}
                        </span>
                    )}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
