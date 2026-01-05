import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
    HiUsers,
    HiCalendar,
    HiPlus,
    HiChevronLeft,
    HiChevronRight,
    HiChevronDown,
} from "react-icons/hi";
import Modal from "../components/Modal";
import type { Id } from "../../convex/_generated/dataModel";
import { MdMan, MdWoman } from "react-icons/md";
import type { IconType } from "react-icons";

// Componente reutilizable para las cards de registro
function RegistrationCard({
    title,
    description,
    icon: Icon,
    iconBgColor,
    iconColor,
    total,
    maleCount,
    femaleCount,
    buttonColorClass,
    onRegister,
}: {
    title: string;
    description: string;
    icon: IconType;
    iconBgColor: string;
    iconColor: string;
    total: number;
    maleCount: number;
    femaleCount: number;
    buttonColorClass: string;
    onRegister: () => void;
}) {
    return (
        <div className="flex flex-col justify-between bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 ${iconBgColor} rounded-xl`}>
                            <Icon className={`h-6 w-6 ${iconColor}`} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">
                                {title}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {description}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mb-4">
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                        {total}
                    </div>
                    <div className="text-sm text-gray-600 flex gap-4">
                        <div className="text-gray-700">
                            <MdMan className="inline h-4 w-4" /> {maleCount}
                        </div>
                        <div className="text-rose-700">
                            <MdWoman className="inline h-4 w-4" /> {femaleCount}
                        </div>
                    </div>
                </div>
            </div>
            <button
                onClick={onRegister}
                className={`w-full py-2 px-4 bg-gradient-to-r ${buttonColorClass} text-white rounded-full font-medium transition-all flex items-center justify-center gap-2`}
            >
                <HiPlus className="h-5 w-5" />
                Registrar
            </button>
        </div>
    );
}

export default function Home() {
    const dashboard = useQuery(api.users.getDashboard);
    const recordAttendance = useMutation(api.attendance.recordAttendance);

    const [viewMode, setViewMode] = useState<"month" | "year">("month");
    const [selectedMonth, setSelectedMonth] = useState<number | null>(
        getCurrentMonth()
    );
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedGroupId, setSelectedGroupId] = useState<Id<"groups"> | null>(
        null
    );
    const [selectedDiscipleId, setSelectedDiscipleId] =
        useState<Id<"users"> | null>(null);
    const [modalType, setModalType] = useState<
        "nuevos" | "asistencias" | "reset" | "conferencia" | null
    >(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Formulario de registro
    const [formData, setFormData] = useState<{
        date: string;
        service: "saturday-1" | "saturday-2" | "sunday-1" | "sunday-2" | null;
        attended: boolean;
        maleCount: number;
        femaleCount: number;
        coLeaderId: Id<"users"> | null;
        coLeaderAttended: boolean | undefined;
    }>({
        date: "",
        service: "sunday-1",
        attended: false,
        maleCount: 0,
        femaleCount: 0,
        coLeaderId: null,
        coLeaderAttended: undefined,
    });

    // Obtener grupos del usuario actual (si es líder)
    const userGroups = useQuery(api.groups.getGroupsAsLeader);

    // Obtener discípulos del usuario actual (si es líder)
    // Si hay un grupo seleccionado, filtrar discípulos de ese grupo
    const allDisciples = useQuery(
        api.users.getDisciplesByLeader,
        dashboard?.user._id ? { leaderId: dashboard.user._id } : "skip"
    );

    // Filtrar discípulos por grupo si hay uno seleccionado
    const disciples =
        selectedGroupId && userGroups
            ? allDisciples?.filter((disciple) => {
                  const group = userGroups.find(
                      (g) => g._id === selectedGroupId
                  );
                  return group?.disciples.some(
                      (d) => d && d._id === disciple._id
                  );
              })
            : allDisciples;

    // Obtener colíderes del usuario actual
    const coLeaders = useQuery(api.attendance.getCoLeaders);

    // Actualizar reportes cuando cambia el mes/año/discípulo
    const periodReport = useQuery(
        api.attendance.getMyMonthlyReport,
        selectedYear
            ? {
                  month:
                      viewMode === "month" && selectedMonth
                          ? selectedMonth
                          : undefined,
                  year: selectedYear,
              }
            : "skip"
    );
    const periodGroupReport = useQuery(
        api.attendance.getGroupAttendanceReport,
        selectedYear
            ? {
                  month:
                      viewMode === "month" && selectedMonth
                          ? selectedMonth
                          : undefined,
                  year: selectedYear,
                  groupId: selectedGroupId || undefined,
                  discipleId: selectedDiscipleId || undefined,
              }
            : "skip"
    );

    // Helper para obtener mes y año actual
    function getCurrentMonth(): number {
        return new Date().getMonth() + 1;
    }

    // Helper para convertir timestamp a formato de fecha (YYYY-MM-DD)
    const timestampToDateString = (timestamp: number): string => {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    // Helper para convertir formato de fecha (YYYY-MM-DD) a timestamp
    const dateStringToTimestamp = (dateString: string): number => {
        const [year, month, day] = dateString.split("-").map(Number);
        const date = new Date(year, month - 1, day, 0, 0, 0, 0);
        return date.getTime();
    };

    // Abrir modal de registro
    const handleOpenModal = (
        type: "nuevos" | "asistencias" | "reset" | "conferencia"
    ) => {
        setModalType(type);
        // Si solo hay un colíder y es para asistencias o conferencia, seleccionarlo por defecto
        const defaultCoLeaderId =
            (type === "asistencias" || type === "conferencia") &&
            coLeaders &&
            coLeaders.length === 1
                ? coLeaders[0]._id
                : null;
        setFormData({
            date: timestampToDateString(Date.now()),
            service:
                type === "nuevos" || type === "asistencias"
                    ? ("sunday-1" as
                          | "saturday-1"
                          | "saturday-2"
                          | "sunday-1"
                          | "sunday-2")
                    : (null as null),
            attended: false,
            maleCount: 0,
            femaleCount: 0,
            coLeaderId: defaultCoLeaderId,
            coLeaderAttended: undefined,
        });
        setErrors({});
    };

    // Cerrar modal
    const handleCloseModal = () => {
        setModalType(null);
        const defaultCoLeaderId =
            coLeaders && coLeaders.length === 1 ? coLeaders[0]._id : null;
        setFormData({
            date: timestampToDateString(Date.now()),
            service: null as null,
            attended: false,
            maleCount: 0,
            femaleCount: 0,
            coLeaderId: defaultCoLeaderId,
            coLeaderAttended: undefined,
        });
        setErrors({});
    };

    // Enviar formulario
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        // Validaciones
        if (!formData.date) {
            setErrors({ date: "Selecciona una fecha" });
            setIsSubmitting(false);
            return;
        }

        if (
            (modalType === "asistencias" || modalType === "conferencia") &&
            formData.attended === undefined
        ) {
            setErrors({ attended: "Indica si asististe o no" });
            setIsSubmitting(false);
            return;
        }

        // Validar servicio solo para nuevos y asistencias
        if (
            (modalType === "nuevos" || modalType === "asistencias") &&
            !formData.service
        ) {
            setErrors({ service: "Debes seleccionar un servicio" });
            setIsSubmitting(false);
            return;
        }

        if (formData.maleCount < 0 || formData.femaleCount < 0) {
            setErrors({
                count: "Las cantidades deben ser números no negativos",
            });
            setIsSubmitting(false);
            return;
        }

        if (formData.maleCount === 0 && formData.femaleCount === 0) {
            setErrors({
                count: "Debes registrar al menos una persona",
            });
            setIsSubmitting(false);
            return;
        }

        // Validar colíder si hay personas del sexo opuesto
        const userGender = dashboard?.user.gender;
        const oppositeGenderCount =
            userGender === "Male" ? formData.femaleCount : formData.maleCount;
        if (oppositeGenderCount > 0 && !formData.coLeaderId) {
            setErrors({
                coLeader:
                    "Debes seleccionar un colíder para registrar personas del sexo opuesto",
            });
            setIsSubmitting(false);
            return;
        }

        try {
            await recordAttendance({
                date: dateStringToTimestamp(formData.date),
                type: modalType!,
                service: formData.service || undefined,
                attended:
                    modalType === "asistencias" || modalType === "conferencia"
                        ? formData.attended
                        : undefined,
                maleCount: formData.maleCount,
                femaleCount: formData.femaleCount,
                coLeaderId: formData.coLeaderId || undefined,
                coLeaderAttended:
                    (modalType === "asistencias" ||
                        modalType === "conferencia") &&
                    formData.coLeaderId
                        ? formData.coLeaderAttended
                        : undefined,
            });

            handleCloseModal();
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Error al registrar asistencia";
            setErrors({ submit: errorMessage });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Navegar entre períodos
    const handlePreviousPeriod = () => {
        if (viewMode === "month" && selectedMonth) {
            if (selectedMonth === 1) {
                setSelectedMonth(12);
                setSelectedYear(selectedYear - 1);
            } else {
                setSelectedMonth(selectedMonth - 1);
            }
        } else {
            // Modo año
            setSelectedYear(selectedYear - 1);
        }
    };

    const handleNextPeriod = () => {
        if (viewMode === "month" && selectedMonth) {
            if (selectedMonth === 12) {
                setSelectedMonth(1);
                setSelectedYear(selectedYear + 1);
            } else {
                setSelectedMonth(selectedMonth + 1);
            }
        } else {
            // Modo año
            setSelectedYear(selectedYear + 1);
        }
    };

    // Cambiar modo de visualización
    const handleViewModeChange = (mode: "month" | "year") => {
        setViewMode(mode);
        if (mode === "year") {
            setSelectedMonth(null);
        } else {
            setSelectedMonth(getCurrentMonth());
        }
    };

    // Manejar cambio de grupo
    const handleGroupChange = (groupId: Id<"groups"> | null) => {
        setSelectedGroupId(groupId);
        // Resetear discípulo cuando cambia el grupo
        setSelectedDiscipleId(null);
    };

    // Resetear filtro de discípulo
    const handleDiscipleChange = (discipleId: Id<"users"> | null) => {
        setSelectedDiscipleId(discipleId);
    };

    const monthNames = [
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre",
    ];

    if (dashboard === undefined || periodReport === undefined) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const currentReport = periodReport;
    const currentGroupReport = periodGroupReport;

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header con filtro de periodo a la derecha */}
                <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Dashboard
                    </h1>

                    {/* Filtro de periodo en la parte superior derecha */}
                    <div className="flex items-center gap-3 bg-white rounded-xl shadow-sm border border-gray-200 p-3">
                        {/* Selector de modo Mes/Año */}
                        <div className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 p-1">
                            <button
                                onClick={() => handleViewModeChange("month")}
                                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                                    viewMode === "month"
                                        ? "bg-blue-500 text-white shadow-sm"
                                        : "text-gray-700 hover:bg-gray-100"
                                }`}
                            >
                                Mes
                            </button>
                            <button
                                onClick={() => handleViewModeChange("year")}
                                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                                    viewMode === "year"
                                        ? "bg-blue-500 text-white shadow-sm"
                                        : "text-gray-700 hover:bg-gray-100"
                                }`}
                            >
                                Año
                            </button>
                        </div>

                        {/* Navegación de período */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePreviousPeriod}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                                title="Período anterior"
                            >
                                <HiChevronLeft className="h-5 w-5 text-gray-600" />
                            </button>
                            <span className="text-sm font-medium text-gray-900 min-w-[140px] text-center px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                                {viewMode === "month" && selectedMonth
                                    ? `${monthNames[selectedMonth - 1]} ${selectedYear}`
                                    : `${selectedYear}`}
                            </span>
                            <button
                                onClick={handleNextPeriod}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={
                                    viewMode === "month" &&
                                    selectedMonth === getCurrentMonth() &&
                                    selectedYear === new Date().getFullYear()
                                }
                                title="Período siguiente"
                            >
                                <HiChevronRight
                                    className={`h-5 w-5 ${
                                        viewMode === "month" &&
                                        selectedMonth === getCurrentMonth() &&
                                        selectedYear ===
                                            new Date().getFullYear()
                                            ? "text-gray-300"
                                            : "text-gray-600"
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>
                {/* Contadores Personales */}
                <div className="mb-8">
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">
                            {viewMode === "month"
                                ? "Contadores del Mes"
                                : "Contadores del Año"}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        <RegistrationCard
                            title="Nuevos"
                            description="Nuevos asistentes"
                            icon={HiUsers}
                            iconBgColor="bg-blue-100"
                            iconColor="text-blue-600"
                            total={currentReport?.nuevos.total || 0}
                            maleCount={currentReport?.nuevos.male || 0}
                            femaleCount={currentReport?.nuevos.female || 0}
                            buttonColorClass="from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                            onRegister={() => handleOpenModal("nuevos")}
                        />

                        <RegistrationCard
                            title="Asistencias"
                            description="Asistencia y nuevos"
                            icon={HiCalendar}
                            iconBgColor="bg-green-100"
                            iconColor="text-green-600"
                            total={currentReport?.asistencias.total || 0}
                            maleCount={currentReport?.asistencias.male || 0}
                            femaleCount={currentReport?.asistencias.female || 0}
                            buttonColorClass="from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                            onRegister={() => handleOpenModal("asistencias")}
                        />

                        <RegistrationCard
                            title="RESET"
                            description="Personas enviadas"
                            icon={HiUsers}
                            iconBgColor="bg-purple-100"
                            iconColor="text-purple-600"
                            total={currentReport?.reset.total || 0}
                            maleCount={currentReport?.reset.male || 0}
                            femaleCount={currentReport?.reset.female || 0}
                            buttonColorClass="from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                            onRegister={() => handleOpenModal("reset")}
                        />

                        <RegistrationCard
                            title="Conferencia"
                            description="Asistencia y nuevos"
                            icon={HiCalendar}
                            iconBgColor="bg-orange-100"
                            iconColor="text-orange-600"
                            total={currentReport?.conferencia.total || 0}
                            maleCount={currentReport?.conferencia.male || 0}
                            femaleCount={currentReport?.conferencia.female || 0}
                            buttonColorClass="from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                            onRegister={() => handleOpenModal("conferencia")}
                        />
                    </div>
                </div>

                {/* Reportes seccionados (Solo para Líderes) */}
                {currentGroupReport?.isLeader && (
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Reportes seccionados
                        </h2>

                        {/* Dropdowns de filtro */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-4">
                            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                                {/* Dropdown de grupos */}
                                {userGroups && userGroups.length > 0 && (
                                    <div className="flex items-center gap-3 flex-1">
                                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                            Por Grupo:
                                        </label>
                                        <div className="relative flex-1">
                                            <select
                                                value={selectedGroupId || ""}
                                                onChange={(e) =>
                                                    handleGroupChange(
                                                        e.target.value
                                                            ? (e.target
                                                                  .value as Id<"groups">)
                                                            : null
                                                    )
                                                }
                                                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer w-full"
                                            >
                                                <option value="">
                                                    Todos los grupos
                                                </option>
                                                {userGroups.map((group) => (
                                                    <option
                                                        key={group._id}
                                                        value={group._id}
                                                    >
                                                        {group.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <HiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                                        </div>
                                    </div>
                                )}

                                {/* Dropdown de discípulos */}
                                {disciples && disciples.length > 0 && (
                                    <div className="flex items-center gap-3 flex-1">
                                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                            Por Discípulo:
                                        </label>
                                        <div className="relative flex-1">
                                            <select
                                                value={selectedDiscipleId || ""}
                                                onChange={(e) =>
                                                    handleDiscipleChange(
                                                        e.target.value
                                                            ? (e.target
                                                                  .value as Id<"users">)
                                                            : null
                                                    )
                                                }
                                                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer w-full"
                                            >
                                                <option value="">
                                                    Todos los discípulos
                                                </option>
                                                {disciples.map((disciple) => (
                                                    <option
                                                        key={disciple._id}
                                                        value={disciple._id}
                                                    >
                                                        {disciple.name ||
                                                            disciple.email}
                                                    </option>
                                                ))}
                                            </select>
                                            <HiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Nuevos - Grupo */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <HiUsers className="h-5 w-5 text-blue-600" />
                                        <h3 className="font-semibold text-gray-900">
                                            Registro de Nuevos
                                        </h3>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900 mb-2">
                                        {currentGroupReport.groupReport?.nuevos
                                            .total || 0}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <div className="flex gap-3 text-xs mt-2 font-medium">
                                            <div className="text-gray-700 flex items-center">
                                                <MdMan className="h-4 w-4" />
                                                {currentGroupReport.groupReport
                                                    ?.nuevos.male || 0}{" "}
                                                hombres
                                            </div>
                                            <div className="text-rose-700 flex items-center">
                                                <MdWoman className="h-4 w-4" />
                                                {currentGroupReport.groupReport
                                                    ?.nuevos.female || 0}{" "}
                                                mujeres
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Asistencias - Grupo */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <HiCalendar className="h-5 w-5 text-green-600" />
                                        <h3 className="font-semibold text-gray-900">
                                            Registro de Asistencias
                                        </h3>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900 mb-2">
                                        {currentGroupReport.groupReport
                                            ?.asistencias.total || 0}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <div className="flex gap-3 text-xs mt-2 font-medium">
                                            <div className="text-gray-700 flex items-center">
                                                <MdMan className="h-4 w-4" />
                                                {currentGroupReport.groupReport
                                                    ?.asistencias.male ||
                                                    0}{" "}
                                                hombres
                                            </div>
                                            <div className="text-rose-700 flex items-center">
                                                <MdWoman className="h-4 w-4" />
                                                {currentGroupReport.groupReport
                                                    ?.asistencias.female ||
                                                    0}{" "}
                                                mujeres
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RESET - Grupo */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <HiUsers className="h-5 w-5 text-purple-600" />
                                        <h3 className="font-semibold text-gray-900">
                                            RESET
                                        </h3>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900 mb-2">
                                        {currentGroupReport.groupReport?.reset
                                            .total || 0}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <div className="flex gap-3 text-xs mt-2 font-medium">
                                            <div className="text-gray-700 flex items-center">
                                                <MdMan className="h-4 w-4" />
                                                {currentGroupReport.groupReport
                                                    ?.reset.male || 0}{" "}
                                                hombres
                                            </div>
                                            <div className="text-rose-700 flex items-center">
                                                <MdWoman className="h-4 w-4" />
                                                {currentGroupReport.groupReport
                                                    ?.reset.female || 0}{" "}
                                                mujeres
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Conferencia - Grupo */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <HiCalendar className="h-5 w-5 text-orange-600" />
                                        <h3 className="font-semibold text-gray-900">
                                            Conferencia
                                        </h3>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900 mb-2">
                                        {currentGroupReport.groupReport
                                            ?.conferencia.total || 0}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <div className="flex gap-3 text-xs mt-2 font-medium">
                                            <div className="text-gray-700 flex items-center">
                                                <MdMan className="h-4 w-4" />
                                                {currentGroupReport.groupReport
                                                    ?.conferencia.male ||
                                                    0}{" "}
                                                hombres
                                            </div>
                                            <div className="text-rose-700 flex items-center">
                                                <MdWoman className="h-4 w-4" />
                                                {currentGroupReport.groupReport
                                                    ?.conferencia.female ||
                                                    0}{" "}
                                                mujeres
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modales de Registro */}
                {modalType && (
                    <Modal
                        isOpen={true}
                        onClose={handleCloseModal}
                        title={
                            modalType === "nuevos"
                                ? "Registro de Nuevos"
                                : modalType === "asistencias"
                                  ? "Registro de Asistencias"
                                  : modalType === "reset"
                                    ? "Registrar RESET"
                                    : "Registrar Conferencia"
                        }
                        maxWidth="md"
                    >
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Fecha */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Fecha
                                </label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            date: e.target.value,
                                        })
                                    }
                                    className={`block w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                                        errors.date
                                            ? "border-red-300 focus:ring-red-500"
                                            : "border-gray-300 focus:ring-blue-500"
                                    }`}
                                    required
                                />
                                {errors.date && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.date}
                                    </p>
                                )}
                            </div>

                            {/* Servicio (solo para nuevos y asistencias) */}
                            {(modalType === "nuevos" ||
                                modalType === "asistencias") && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Servicio
                                    </label>
                                    <select
                                        value={formData.service || ""}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                service: e.target
                                                    .value as typeof formData.service,
                                            })
                                        }
                                        className={`block w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                                            errors.service
                                                ? "border-red-300 focus:ring-red-500"
                                                : "border-gray-300 focus:ring-blue-500"
                                        }`}
                                        required
                                    >
                                        <option value="saturday-1">
                                            Sábado NEXT 5PM
                                        </option>
                                        <option value="saturday-2">
                                            Sábado NEXT 7PM
                                        </option>
                                        <option value="sunday-1">
                                            Domingo 9AM
                                        </option>
                                        <option value="sunday-2">
                                            Domingo 11:30AM
                                        </option>
                                    </select>
                                    {errors.service && (
                                        <p className="mt-1 text-sm text-red-600">
                                            {errors.service}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Asistencia (solo para asistencias y conferencia) */}
                            {(modalType === "asistencias" ||
                                modalType === "conferencia") && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            ¿Asististe?
                                        </label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="attended"
                                                    checked={
                                                        formData.attended ===
                                                        true
                                                    }
                                                    onChange={() =>
                                                        setFormData({
                                                            ...formData,
                                                            attended: true,
                                                        })
                                                    }
                                                    className="w-4 h-4 text-blue-600"
                                                />
                                                <span className="text-gray-700">
                                                    Sí
                                                </span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="attended"
                                                    checked={
                                                        formData.attended ===
                                                        false
                                                    }
                                                    onChange={() =>
                                                        setFormData({
                                                            ...formData,
                                                            attended: false,
                                                        })
                                                    }
                                                    className="w-4 h-4 text-blue-600"
                                                />
                                                <span className="text-gray-700">
                                                    No
                                                </span>
                                            </label>
                                        </div>
                                        {errors.attended && (
                                            <p className="mt-1 text-sm text-red-600">
                                                {errors.attended}
                                            </p>
                                        )}
                                    </div>

                                    {/* Sección del colíder para asistencias y conferencia */}
                                    {coLeaders && coLeaders.length > 0 && (
                                        <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                            <div className="text-sm font-medium text-gray-700">
                                                Colíder
                                            </div>

                                            {/* Selector de colíder si hay más de uno */}
                                            {coLeaders.length > 1 && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Seleccionar colíder
                                                    </label>
                                                    <select
                                                        value={
                                                            formData.coLeaderId ||
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            setFormData({
                                                                ...formData,
                                                                coLeaderId: e
                                                                    .target
                                                                    .value
                                                                    ? (e.target
                                                                          .value as Id<"users">)
                                                                    : null,
                                                                coLeaderAttended:
                                                                    undefined, // Reset cuando cambia el colíder
                                                            })
                                                        }
                                                        className="block w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                    >
                                                        <option value="">
                                                            Ninguno
                                                        </option>
                                                        {coLeaders.map(
                                                            (coLeader) => (
                                                                <option
                                                                    key={
                                                                        coLeader._id
                                                                    }
                                                                    value={
                                                                        coLeader._id
                                                                    }
                                                                >
                                                                    {coLeader.name ||
                                                                        coLeader.email}
                                                                </option>
                                                            )
                                                        )}
                                                    </select>
                                                </div>
                                            )}

                                            {/* Radio buttons para asistencia del colíder */}
                                            {formData.coLeaderId && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        ¿El colíder asistió?
                                                    </label>
                                                    <div className="flex gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="coLeaderAttended"
                                                                checked={
                                                                    formData.coLeaderAttended ===
                                                                    true
                                                                }
                                                                onChange={() =>
                                                                    setFormData(
                                                                        {
                                                                            ...formData,
                                                                            coLeaderAttended: true,
                                                                        }
                                                                    )
                                                                }
                                                                className="w-4 h-4 text-blue-600"
                                                            />
                                                            <span className="text-gray-700">
                                                                Sí
                                                            </span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="coLeaderAttended"
                                                                checked={
                                                                    formData.coLeaderAttended ===
                                                                    false
                                                                }
                                                                onChange={() =>
                                                                    setFormData(
                                                                        {
                                                                            ...formData,
                                                                            coLeaderAttended: false,
                                                                        }
                                                                    )
                                                                }
                                                                className="w-4 h-4 text-blue-600"
                                                            />
                                                            <span className="text-gray-700">
                                                                No
                                                            </span>
                                                        </label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Cantidad de Hombres */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cantidad de Hombres
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.maleCount}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            maleCount:
                                                parseInt(e.target.value) || 0,
                                        })
                                    }
                                    className={`block w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                                        errors.count
                                            ? "border-red-300 focus:ring-red-500"
                                            : "border-gray-300 focus:ring-blue-500"
                                    }`}
                                    required
                                />
                            </div>

                            {/* Cantidad de Mujeres */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cantidad de Mujeres
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.femaleCount}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            femaleCount:
                                                parseInt(e.target.value) || 0,
                                        })
                                    }
                                    className={`block w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                                        errors.count
                                            ? "border-red-300 focus:ring-red-500"
                                            : "border-gray-300 focus:ring-blue-500"
                                    }`}
                                    required
                                />
                                {errors.count && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.count}
                                    </p>
                                )}
                            </div>

                            {/* Dropdown de Colíder (solo si hay personas del sexo opuesto) */}
                            {dashboard?.user.gender &&
                                ((dashboard.user.gender === "Male" &&
                                    formData.femaleCount > 0) ||
                                    (dashboard.user.gender === "Female" &&
                                        formData.maleCount > 0)) &&
                                coLeaders &&
                                coLeaders.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Colíder
                                            <span className="text-red-500 ml-1">
                                                *
                                            </span>
                                        </label>
                                        <select
                                            value={formData.coLeaderId || ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    coLeaderId: e.target.value
                                                        ? (e.target
                                                              .value as Id<"users">)
                                                        : null,
                                                })
                                            }
                                            className={`block w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                                                errors.coLeader
                                                    ? "border-red-300 focus:ring-red-500"
                                                    : "border-gray-300 focus:ring-blue-500"
                                            }`}
                                            required
                                        >
                                            <option value="">
                                                Selecciona un colíder
                                            </option>
                                            {coLeaders.map((coLeader) => (
                                                <option
                                                    key={coLeader._id}
                                                    value={coLeader._id}
                                                >
                                                    {coLeader.name ||
                                                        coLeader.email}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.coLeader && (
                                            <p className="mt-1 text-sm text-red-600">
                                                {errors.coLeader}
                                            </p>
                                        )}
                                    </div>
                                )}

                            {/* Error general */}
                            {errors.submit && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600">
                                        {errors.submit}
                                    </p>
                                </div>
                            )}

                            {/* Botones */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-colors"
                                    disabled={isSubmitting}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-medium hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? "Registrando..."
                                        : "Registrar"}
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </div>
        </div>
    );
}
