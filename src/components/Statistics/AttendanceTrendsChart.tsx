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
    "saturday-1": number;
    "saturday-2": number;
    "sunday-1": number;
    "sunday-2": number;
}

interface AttendanceTrendsChartProps {
    data: AttendanceTrendsData[];
}

const COLORS = {
    "saturday-1": "#3B82F6", // Azul - Sábado NEXT 5PM
    "saturday-2": "#10B981", // Verde - Sábado NEXT 7PM
    "sunday-1": "#F59E0B", // Naranja - Domingo 9AM
    "sunday-2": "#8B5CF6", // Morado - Domingo 11:30AM
};

const SERVICE_NAMES = {
    "saturday-1": "Sábado NEXT 5PM",
    "saturday-2": "Sábado NEXT 7PM",
    "sunday-1": "Domingo 9AM",
    "sunday-2": "Domingo 11:30AM",
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
                <YAxis 
                    stroke="#666666" 
                    style={{ fontSize: "12px" }}
                    domain={[0, 'auto']}
                    allowDecimals={false}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e5e5",
                        borderRadius: "4px",
                    }}
                    formatter={(value: number | undefined, name: string | undefined) => [
                        value !== undefined
                            ? `${value} ${value === 1 ? "persona" : "personas"}`
                            : "0 personas",
                        SERVICE_NAMES[name as keyof typeof SERVICE_NAMES] || name,
                    ]}
                />
                <Legend
                    formatter={(value) =>
                        SERVICE_NAMES[value as keyof typeof SERVICE_NAMES] || value
                    }
                />
                <Line
                    type="monotone"
                    dataKey="saturday-1"
                    stroke={COLORS["saturday-1"]}
                    strokeWidth={2}
                    name="saturday-1"
                    dot={{ fill: COLORS["saturday-1"], r: 4 }}
                    activeDot={{ r: 6 }}
                />
                <Line
                    type="monotone"
                    dataKey="saturday-2"
                    stroke={COLORS["saturday-2"]}
                    strokeWidth={2}
                    name="saturday-2"
                    dot={{ fill: COLORS["saturday-2"], r: 4 }}
                    activeDot={{ r: 6 }}
                />
                <Line
                    type="monotone"
                    dataKey="sunday-1"
                    stroke={COLORS["sunday-1"]}
                    strokeWidth={2}
                    name="sunday-1"
                    dot={{ fill: COLORS["sunday-1"], r: 4 }}
                    activeDot={{ r: 6 }}
                />
                <Line
                    type="monotone"
                    dataKey="sunday-2"
                    stroke={COLORS["sunday-2"]}
                    strokeWidth={2}
                    name="sunday-2"
                    dot={{ fill: COLORS["sunday-2"], r: 4 }}
                    activeDot={{ r: 6 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
