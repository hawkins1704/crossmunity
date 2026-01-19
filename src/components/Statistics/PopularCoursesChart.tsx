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

interface PopularCoursesData {
    courseName: string;
    count: number;
}

interface PopularCoursesChartProps {
    data: PopularCoursesData[];
}

export default function PopularCoursesChart({
    data,
}: PopularCoursesChartProps) {
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
                layout="vertical"
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis type="number" stroke="#666666" style={{ fontSize: "12px" }} />
                <YAxis
                    type="category"
                    dataKey="courseName"
                    stroke="#666666"
                    style={{ fontSize: "12px" }}
                    width={150}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e5e5",
                        borderRadius: "4px",
                    }}
                    formatter={(value: number | undefined) => [
                        value !== undefined
                            ? `${value} ${value === 1 ? "inscrito" : "inscritos"}`
                            : "0 inscritos",
                        "",
                    ]}
                />
                <Legend />
                <Bar
                    dataKey="count"
                    fill="#000000"
                    name="Inscritos"
                    radius={[0, 4, 4, 0]}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
