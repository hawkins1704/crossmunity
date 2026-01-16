import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

interface AgeDistributionData {
    range: string;
    count: number;
}

interface AgeDistributionChartProps {
    data: AgeDistributionData[];
}

export default function AgeDistributionChart({
    data,
}: AgeDistributionChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-[#666666]">
                <p className="text-sm">No hay datos disponibles</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis
                    dataKey="range"
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
                />
                <Legend />
                <Bar
                    dataKey="count"
                    fill="#000000"
                    name="Cantidad"
                    radius={[4, 4, 0, 0]}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
