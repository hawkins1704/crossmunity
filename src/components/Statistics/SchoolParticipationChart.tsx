import {
    PieChart,
    Pie,
    Cell,
    Legend,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

interface SchoolParticipationData {
    active: number;
    inactive: number;
}

interface SchoolParticipationChartProps {
    data: SchoolParticipationData;
}

const COLORS = {
    active: "#10B981", // Verde
    inactive: "#6B7280", // Gris
};

export default function SchoolParticipationChart({
    data,
}: SchoolParticipationChartProps) {
    if (!data || (data.active === 0 && data.inactive === 0)) {
        return (
            <div className="flex items-center justify-center h-64 text-[#666666]">
                <p className="text-sm">No hay datos disponibles</p>
            </div>
        );
    }

    const chartData = [
        { name: "Activos", value: data.active, color: COLORS.active },
        { name: "No activos", value: data.inactive, color: COLORS.inactive },
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
                        percent !== undefined
                            ? `${name}: ${(percent * 100).toFixed(1)}%`
                            : ""
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
                        value !== undefined
                            ? `${value} ${value === 1 ? "persona" : "personas"}`
                            : "0 personas",
                        "Cantidad",
                    ]}
                />
                <Legend
                    formatter={(entry) => {
                        const payload = entry.payload as {
                            name?: string;
                            value?: number;
                        };
                        return (
                            <span style={{ color: entry.color }}>
                                {payload?.name}: {payload?.value ?? 0}
                            </span>
                        );
                    }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
