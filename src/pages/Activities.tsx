import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
    HiCalendar,
    HiChevronLeft,
    HiChevronRight,
} from "react-icons/hi";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import type { Id } from "../../convex/_generated/dataModel";

// Componente para la vista de calendario de actividades
function ActivitiesCalendarView({
    activities,
    onActivityClick,
}: {
    activities: Array<{
        _id: Id<"activities">;
        name: string;
        address: string;
        dateTime: number;
        activityType: "leader" | "disciple";
        groupName: string;
    }>;
    onActivityClick: (activityId: Id<"activities">) => void;
}) {
    const [currentDate, setCurrentDate] = useState(new Date());

    // Nombres de los días de la semana
    const weekDays = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

    // Obtener el primer día del mes y el número de días
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    // Obtener el día de la semana del primer día (0 = domingo, 1 = lunes, etc.)
    // Ajustar para que lunes sea 0
    const firstDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

    // Obtener días del mes anterior para completar la primera semana
    const prevMonth = new Date(year, month - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();
    const prevMonthDays: number[] = [];
    if (firstDayOfWeek > 0) {
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            prevMonthDays.push(daysInPrevMonth - i);
        }
    }

    // Obtener días del mes siguiente para completar la última semana
    const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
    const nextMonthDays: number[] = [];
    const remainingCells = totalCells - (firstDayOfWeek + daysInMonth);
    for (let i = 1; i <= remainingCells; i++) {
        nextMonthDays.push(i);
    }

    // Agrupar actividades por fecha (solo día del mes, sin hora)
    const activitiesByDate = activities.reduce(
        (acc, activity) => {
            const date = new Date(activity.dateTime);
            const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }

            acc[dateKey].push(activity);
            return acc;
        },
        {} as Record<string, typeof activities>
    );

    // Función para obtener actividades de un día específico
    const getActivitiesForDate = (
        day: number,
        isCurrentMonth: boolean,
        isPrevMonth: boolean
    ) => {
        if (!isCurrentMonth) {
            const checkDate = isPrevMonth
                ? new Date(year, month - 1, day)
                : new Date(year, month + 1, day);
            const dateKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
            return activitiesByDate[dateKey] || [];
        }
        const dateKey = `${year}-${month}-${day}`;
        return activitiesByDate[dateKey] || [];
    };

    // Verificar si un día es hoy
    const isToday = (day: number, isCurrentMonth: boolean) => {
        if (!isCurrentMonth) return false;
        const today = new Date();
        return (
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        );
    };

    // Navegación de meses
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // Formatear nombre del mes y año
    const monthName = currentDate.toLocaleDateString("es-ES", {
        month: "long",
        year: "numeric",
    });

    // Función para obtener la hora formateada
    const getTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="space-y-4">
            {/* Navegación del calendario */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToPreviousMonth}
                        className="p-2 hover:bg-[#fafafa] transition-colors border border-[#e5e5e5]"
                        title="Mes anterior"
                    >
                        <HiChevronLeft className="h-5 w-5 text-black" />
                    </button>
                    <h3 className="text-sm font-normal text-black capitalize px-3 py-2 bg-white border border-[#e5e5e5] min-w-[200px] text-center">
                        {monthName}
                    </h3>
                    <button
                        onClick={goToNextMonth}
                        className="p-2 hover:bg-[#fafafa] transition-colors border border-[#e5e5e5]"
                        title="Mes siguiente"
                    >
                        <HiChevronRight className="h-5 w-5 text-black" />
                    </button>
                </div>
                <button
                    onClick={goToToday}
                    className="px-4 py-2 text-sm font-normal text-black bg-white border border-[#e5e5e5] hover:bg-[#fafafa] transition-colors"
                >
                    Hoy
                </button>
            </div>

            {/* Calendario */}
            <div className="bg-white border border-[#e5e5e5] overflow-hidden">
                {/* Encabezados de días de la semana */}
                <div className="grid grid-cols-7 border-b border-[#e5e5e5]">
                    {weekDays.map((day) => (
                        <div
                            key={day}
                            className="p-3 text-center text-xs font-normal text-black uppercase bg-[#fafafa]"
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Días del calendario */}
                <div className="grid grid-cols-7">
                    {/* Días del mes anterior */}
                    {prevMonthDays.map((day, index) => {
                        const dayActivities = getActivitiesForDate(
                            day,
                            false,
                            true
                        );
                        const dayIndex = index;
                        const isLastColumn = (dayIndex + 1) % 7 === 0;
                        return (
                            <div
                                key={`prev-${day}`}
                                className={`min-h-[120px] border-b border-[#e5e5e5] p-2 bg-[#fafafa] ${
                                    !isLastColumn ? "border-r border-[#e5e5e5]" : ""
                                }`}
                            >
                                <div className="text-xs text-[#999999] mb-1">
                                    {day}
                                </div>
                                <div className="space-y-0.5">
                                    {dayActivities
                                        .slice(0, 4)
                                        .map((activity) => (
                                            <div
                                                key={activity._id}
                                                className={`text-xs px-1.5 py-0.5 truncate cursor-pointer transition-colors border ${
                                                    activity.activityType ===
                                                    "leader"
                                                        ? "bg-blue-50 text-black border-blue-200 hover:bg-blue-100"
                                                        : "bg-purple-50 text-black border-purple-200 hover:bg-purple-100"
                                                }`}
                                                onClick={() =>
                                                    onActivityClick(
                                                        activity._id
                                                    )
                                                }
                                                title={`${getTime(activity.dateTime)} - ${activity.name} (${activity.groupName})`}
                                            >
                                                <span className="font-normal">
                                                    {getTime(activity.dateTime)}
                                                </span>{" "}
                                                {activity.name}
                                            </div>
                                        ))}
                                    {dayActivities.length > 4 && (
                                        <div className="text-xs text-[#666666] font-normal px-1.5">
                                            +{dayActivities.length - 4} más
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Días del mes actual */}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                        (day, dayMapIndex) => {
                            const dayActivities = getActivitiesForDate(
                                day,
                                true,
                                false
                            );
                            const today = isToday(day, true);
                            const dayIndex = prevMonthDays.length + dayMapIndex;
                            const isLastColumn = (dayIndex + 1) % 7 === 0;

                            return (
                                <div
                                    key={day}
                                    className={`min-h-[120px] border-b border-[#e5e5e5] p-2 hover:bg-[#fafafa] transition-colors ${
                                        today ? "bg-blue-50" : ""
                                    } ${!isLastColumn ? "border-r border-[#e5e5e5]" : ""}`}
                                >
                                    <div
                                        className={`text-sm font-normal mb-1 inline-flex items-center justify-center ${
                                            today
                                                ? "w-7 h-7 bg-black text-white"
                                                : "text-black"
                                        }`}
                                    >
                                        {day}
                                    </div>
                                    <div className="space-y-0.5">
                                        {dayActivities
                                            .slice(0, 4)
                                            .map((activity) => (
                                                <div
                                                    key={activity._id}
                                                    className={`text-xs px-1.5 py-0.5 truncate cursor-pointer transition-colors border ${
                                                        activity.activityType ===
                                                        "leader"
                                                            ? "bg-blue-50 text-black border-blue-200 hover:bg-blue-100"
                                                            : "bg-purple-50 text-black border-purple-200 hover:bg-purple-100"
                                                    }`}
                                                    onClick={() =>
                                                        onActivityClick(
                                                            activity._id
                                                        )
                                                    }
                                                    title={`${getTime(activity.dateTime)} - ${activity.name} (${activity.groupName})`}
                                                >
                                                    <span className="font-normal">
                                                        {getTime(
                                                            activity.dateTime
                                                        )}
                                                    </span>{" "}
                                                    {activity.name}
                                                </div>
                                            ))}
                                        {dayActivities.length > 4 && (
                                            <div className="text-xs text-[#666666] font-normal px-1.5">
                                                +{dayActivities.length - 4} más
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        }
                    )}

                    {/* Días del mes siguiente */}
                    {nextMonthDays.map((day, index) => {
                        const dayActivities = getActivitiesForDate(
                            day,
                            false,
                            false
                        );
                        const dayIndex =
                            prevMonthDays.length + daysInMonth + index;
                        const isLastColumn = (dayIndex + 1) % 7 === 0;
                        return (
                            <div
                                key={`next-${day}`}
                                className={`min-h-[120px] border-b border-[#e5e5e5] p-2 bg-[#fafafa] ${
                                    !isLastColumn ? "border-r border-[#e5e5e5]" : ""
                                }`}
                            >
                                <div className="text-xs text-[#999999] mb-1">
                                    {day}
                                </div>
                                <div className="space-y-0.5">
                                    {dayActivities
                                        .slice(0, 4)
                                        .map((activity) => (
                                            <div
                                                key={activity._id}
                                                className={`text-xs px-1.5 py-0.5 truncate cursor-pointer transition-colors border ${
                                                    activity.activityType ===
                                                    "leader"
                                                        ? "bg-blue-50 text-black border-blue-200 hover:bg-blue-100"
                                                        : "bg-purple-50 text-black border-purple-200 hover:bg-purple-100"
                                                }`}
                                                onClick={() =>
                                                    onActivityClick(
                                                        activity._id
                                                    )
                                                }
                                                title={`${getTime(activity.dateTime)} - ${activity.name} (${activity.groupName})`}
                                            >
                                                <span className="font-normal">
                                                    {getTime(activity.dateTime)}
                                                </span>{" "}
                                                {activity.name}
                                            </div>
                                        ))}
                                    {dayActivities.length > 4 && (
                                        <div className="text-xs text-[#666666] font-normal px-1.5">
                                            +{dayActivities.length - 4} más
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default function Activities() {
    const myActivities = useQuery(api.activities.getMyActivities);
    const [selectedActivityId, setSelectedActivityId] =
        useState<Id<"activities"> | null>(null);
    const activityDetails = useQuery(
        api.activities.getActivityWithResponses,
        selectedActivityId ? { activityId: selectedActivityId } : "skip"
    );

    if (myActivities === undefined) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin h-12 w-12 border-2 border-black border-t-transparent"></div>
            </div>
        );
    }

    if (myActivities.length === 0) {
        return (
            <div className="space-y-6">
                <PageHeader
                    title="Actividades"
                    description="Visualiza y gestiona las actividades de tus grupos"
                />
                <div className="bg-white border border-[#e5e5e5] p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-black mb-6">
                        <HiCalendar className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-normal text-black mb-3 tracking-tight">
                        No hay actividades
                    </h3>
                    <p className="text-sm font-normal text-[#666666]">
                        No tienes actividades programadas en tus grupos.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Actividades"
                description="Visualiza y gestiona las actividades de tus grupos"
            />

            {/* Leyenda */}
            <div className="bg-white border border-[#e5e5e5] p-4">
                <div className="flex items-center gap-6 flex-wrap">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-50 border border-blue-200"></div>
                        <span className="text-sm text-black font-normal">
                            Actividades como Líder
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-purple-50 border border-purple-200"></div>
                        <span className="text-sm text-black font-normal">
                            Actividades como Discípulo
                        </span>
                    </div>
                </div>
            </div>

            {/* Calendario */}
            <div className="bg-white border border-[#e5e5e5] p-6">
                <ActivitiesCalendarView
                    activities={myActivities}
                    onActivityClick={setSelectedActivityId}
                />
            </div>

                {/* Modal de detalles de actividad */}
                {selectedActivityId && activityDetails && (
                    <Modal
                        isOpen={true}
                        onClose={() => setSelectedActivityId(null)}
                        title={activityDetails.activity.name}
                        maxWidth="2xl"
                    >
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
                                    Grupo
                                </label>
                                <p className="text-sm font-normal text-black">
                                    {activityDetails.group.name}
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
                                    Fecha y Hora
                                </label>
                                <p className="text-sm font-normal text-black">
                                    {new Date(
                                        activityDetails.activity.dateTime
                                    ).toLocaleString("es-ES", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
                                    Dirección
                                </label>
                                <p className="text-sm font-normal text-black">
                                    {activityDetails.activity.address}
                                </p>
                            </div>
                            {activityDetails.activity.description && (
                                <div>
                                    <label className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
                                        Descripción
                                    </label>
                                    <div
                                        className="text-sm font-normal text-black prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{
                                            __html: activityDetails.activity
                                                .description,
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </Modal>
                )}
        </div>
    );
}

