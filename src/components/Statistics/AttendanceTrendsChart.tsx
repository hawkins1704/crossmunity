import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

interface AttendanceTrendsData {
    month: string;
    nuevos: number;
    reset: number;
}

interface AttendanceTrendsChartProps {
    data: AttendanceTrendsData[];
}

const COLORS = {
    nuevos: "#10B981", // Verde
    reset: "#8B5CF6", // Púrpura
};

export default function AttendanceTrendsChart({
    data,
}: AttendanceTrendsChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-[#666666]">
                <p className="text-sm">No hay datos disponibles</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis
                    dataKey="month"
                    stroke="#666666"
                    style={{ fontSize: "12px" }}
                />
                <YAxis stroke="#666666" style={{ fontSize: "12px" }} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e5e5",
                        borderRadius: "4px",
                    }}
                    formatter={(value: number, name: string) => [
                        `${value} ${value === 1 ? "persona" : "personas"}`,
                        name === "nuevos" ? "Nuevos" : "RESET",
                    ]}
                />
                <Legend
                    formatter={(value) =>
                        value === "nuevos" ? "Nuevos" : "RESET"
                    }
                />
                <Line
                    type="monotone"
                    dataKey="nuevos"
                    stroke={COLORS.nuevos}
                    strokeWidth={2}
                    name="nuevos"
                    dot={{ fill: COLORS.nuevos, r: 4 }}
                    activeDot={{ r: 6 }}
                />
                <Line
                    type="monotone"
                    dataKey="reset"
                    stroke={COLORS.reset}
                    strokeWidth={2}
                    name="reset"
                    dot={{ fill: COLORS.reset, r: 4 }}
                    activeDot={{ r: 6 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
