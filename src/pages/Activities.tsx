import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
    HiCalendar,
    HiChevronLeft,
    HiChevronRight,
} from "react-icons/hi";
import Modal from "../components/Modal";
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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={goToPreviousMonth}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Mes anterior"
                    >
                        <HiChevronLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <h3 className="text-xl font-semibold text-gray-900 capitalize">
                        {monthName}
                    </h3>
                    <button
                        onClick={goToNextMonth}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Mes siguiente"
                    >
                        <HiChevronRight className="h-5 w-5 text-gray-600" />
                    </button>
                </div>
                <button
                    onClick={goToToday}
                    className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                    Hoy
                </button>
            </div>

            {/* Calendario */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Encabezados de días de la semana */}
                <div className="grid grid-cols-7 border-b border-gray-200">
                    {weekDays.map((day) => (
                        <div
                            key={day}
                            className="p-3 text-center text-xs font-semibold text-gray-600 uppercase bg-gray-50"
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
                                className={`min-h-[120px] border-b border-gray-200 p-2 bg-gray-50 ${
                                    !isLastColumn ? "border-r" : ""
                                }`}
                            >
                                <div className="text-xs text-gray-400 mb-1">
                                    {day}
                                </div>
                                <div className="space-y-0.5">
                                    {dayActivities
                                        .slice(0, 4)
                                        .map((activity) => (
                                            <div
                                                key={activity._id}
                                                className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer transition-colors ${
                                                    activity.activityType ===
                                                    "leader"
                                                        ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                                        : "bg-purple-100 text-purple-800 hover:bg-purple-200"
                                                }`}
                                                onClick={() =>
                                                    onActivityClick(
                                                        activity._id
                                                    )
                                                }
                                                title={`${getTime(activity.dateTime)} - ${activity.name} (${activity.groupName})`}
                                            >
                                                <span className="font-medium">
                                                    {getTime(activity.dateTime)}
                                                </span>{" "}
                                                {activity.name}
                                            </div>
                                        ))}
                                    {dayActivities.length > 4 && (
                                        <div className="text-xs text-gray-500 font-medium px-1.5">
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
                                    className={`min-h-[120px] border-b border-gray-200 p-2 hover:bg-gray-50 transition-colors ${
                                        today ? "bg-blue-50" : ""
                                    } ${!isLastColumn ? "border-r" : ""}`}
                                >
                                    <div
                                        className={`text-sm font-medium mb-1 inline-flex items-center justify-center ${
                                            today
                                                ? "w-7 h-7 rounded-full bg-blue-600 text-white"
                                                : "text-gray-900"
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
                                                    className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer transition-colors ${
                                                        activity.activityType ===
                                                        "leader"
                                                            ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                                            : "bg-purple-100 text-purple-800 hover:bg-purple-200"
                                                    }`}
                                                    onClick={() =>
                                                        onActivityClick(
                                                            activity._id
                                                        )
                                                    }
                                                    title={`${getTime(activity.dateTime)} - ${activity.name} (${activity.groupName})`}
                                                >
                                                    <span className="font-medium">
                                                        {getTime(
                                                            activity.dateTime
                                                        )}
                                                    </span>{" "}
                                                    {activity.name}
                                                </div>
                                            ))}
                                        {dayActivities.length > 4 && (
                                            <div className="text-xs text-gray-500 font-medium px-1.5">
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
                                className={`min-h-[120px] border-b border-gray-200 p-2 bg-gray-50 ${
                                    !isLastColumn ? "border-r" : ""
                                }`}
                            >
                                <div className="text-xs text-gray-400 mb-1">
                                    {day}
                                </div>
                                <div className="space-y-0.5">
                                    {dayActivities
                                        .slice(0, 4)
                                        .map((activity) => (
                                            <div
                                                key={activity._id}
                                                className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer transition-colors ${
                                                    activity.activityType ===
                                                    "leader"
                                                        ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                                        : "bg-purple-100 text-purple-800 hover:bg-purple-200"
                                                }`}
                                                onClick={() =>
                                                    onActivityClick(
                                                        activity._id
                                                    )
                                                }
                                                title={`${getTime(activity.dateTime)} - ${activity.name} (${activity.groupName})`}
                                            >
                                                <span className="font-medium">
                                                    {getTime(activity.dateTime)}
                                                </span>{" "}
                                                {activity.name}
                                            </div>
                                        ))}
                                    {dayActivities.length > 4 && (
                                        <div className="text-xs text-gray-500 font-medium px-1.5">
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (myActivities.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Actividades
                        </h1>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                        <HiCalendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No hay actividades
                        </h3>
                        <p className="text-gray-600">
                            No tienes actividades programadas en tus grupos.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Actividades
                    </h1>
                </div>

                {/* Leyenda */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-4">
                    <div className="flex items-center gap-6 flex-wrap">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300"></div>
                            <span className="text-sm text-gray-700 font-medium">
                                Actividades como Líder
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-purple-100 border border-purple-300"></div>
                            <span className="text-sm text-gray-700 font-medium">
                                Actividades como Discípulo
                            </span>
                        </div>
                    </div>
                </div>

                {/* Calendario */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
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
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-1">
                                    Grupo
                                </h3>
                                <p className="text-gray-900">
                                    {activityDetails.group.name}
                                </p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-1">
                                    Fecha y Hora
                                </h3>
                                <p className="text-gray-900">
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
                                <h3 className="text-sm font-medium text-gray-700 mb-1">
                                    Dirección
                                </h3>
                                <p className="text-gray-900">
                                    {activityDetails.activity.address}
                                </p>
                            </div>
                            {activityDetails.activity.description && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700 mb-1">
                                        Descripción
                                    </h3>
                                    <div
                                        className="text-gray-900 prose prose-sm max-w-none"
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
        </div>
    );
}

