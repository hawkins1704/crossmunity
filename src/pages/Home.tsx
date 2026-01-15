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
import { LuBaby } from "react-icons/lu";

// Componente reutilizable para las cards de registro
function RegistrationCard({
    title,
    description,
    icon: Icon,
    total,
    maleCount,
    femaleCount,
    kidsCount,
    onRegister,
}: {
    title: string;
    description: string;
    icon: IconType;
    total: number;
    maleCount: number;
    femaleCount: number;
    kidsCount?: number;
    onRegister: () => void;
}) {
    // Determinar color basado en el título del card
    let colors = {
        iconBg: "bg-blue-50",
        iconText: "text-blue-700",
        hoverBg: "hover:bg-blue-50",
        hoverText: "hover:text-black",
    };

    if (title === "Nuevos") {
        colors = {
            iconBg: "bg-blue-50",
            iconText: "text-blue-700",
            hoverBg: "hover:bg-blue-50",
            hoverText: "hover:text-black",
        };
    } else if (title === "Asistencias") {
        colors = {
            iconBg: "bg-green-50",
            iconText: "text-green-700",
            hoverBg: "hover:bg-green-50",
            hoverText: "hover:text-black",
        };
    } else if (title === "RESET") {
        colors = {
            iconBg: "bg-purple-50",
            iconText: "text-purple-700",
            hoverBg: "hover:bg-purple-50",
            hoverText: "hover:text-black",
        };
    } else if (title === "Conferencia") {
        colors = {
            iconBg: "bg-orange-50",
            iconText: "text-orange-700",
            hoverBg: "hover:bg-orange-50",
            hoverText: "hover:text-black",
        };
    }

    return (
        <div className="flex flex-col justify-between bg-white border border-[#e5e5e5] p-6">
            <div className="flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 ${colors.iconBg}`}>
                            <Icon className={`h-6 w-6 ${colors.iconText}`} />
                        </div>
                        <div>
                            <h3 className="font-normal text-black text-sm">
                                {title}
                            </h3>
                            <p className="text-xs text-[#666666]">
                                {description}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mb-4">
                    <div className="text-3xl font-normal text-black mb-1">
                        {total}
                    </div>
                    <div className="text-xs text-[#666666] flex gap-4 flex-wrap">
                        <div className="text-black">
                            <MdMan className="inline h-4 w-4" /> {maleCount}
                        </div>
                        <div className="text-black">
                            <MdWoman className="inline h-4 w-4" /> {femaleCount}
                        </div>

                        <div className="text-black">
                            <LuBaby className="inline h-4 w-4" />{" "}
                            {kidsCount}
                        </div>
                    </div>
                </div>
            </div>
            <button
                onClick={onRegister}
                className={`w-full py-3 px-4 border border-black text-black font-normal text-sm transition-colors flex items-center justify-center gap-2 ${colors.hoverBg} ${colors.hoverText}`}
            >
                <HiPlus className="h-4 w-4" />
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
        sede:
            | "CENTRAL"
            | "LINCE"
            | "LOS OLIVOS"
            | "SJM"
            | "VMT"
            | "PACHACAMAC"
            | "SJL"
            | "CHORRILLOS"
            | "SURCO"
            | "MIRAFLORES"
            | "VES"
            | null;
        attended: boolean;
        maleCount: number;
        femaleCount: number;
        kidsCount: number;
        coLeaderId: Id<"users"> | null;
        coLeaderAttended: boolean | undefined;
    }>({
        date: "",
        service: "sunday-1",
        sede: null,
        attended: false,
        maleCount: 0,
        femaleCount: 0,
        kidsCount: 0,
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
    // El input de tipo "date" siempre devuelve la fecha en formato YYYY-MM-DD
    // que representa una fecha calendario, no una fecha/hora específica.
    // Para preservar la fecha exacta que el usuario seleccionó, creamos
    // un timestamp UTC que representa medianoche UTC de esa fecha.
    // Esto asegura que la fecha se guarde correctamente independientemente
    // de la zona horaria del cliente o servidor.
    const dateStringToTimestamp = (dateString: string): number => {
        const [year, month, day] = dateString.split("-").map(Number);
        // Crear fecha en UTC a medianoche para la fecha seleccionada
        // Esto representa la fecha calendario sin considerar zona horaria
        return Date.UTC(year, month - 1, day, 0, 0, 0, 0);
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
            sede: null,
            attended: false,
            maleCount: 0,
            femaleCount: 0,
            kidsCount: 0,
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
            sede: null,
            attended: false,
            maleCount: 0,
            femaleCount: 0,
            kidsCount: 0,
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

        if (
            formData.maleCount < 0 ||
            formData.femaleCount < 0 ||
            formData.kidsCount < 0
        ) {
            setErrors({
                count: "Las cantidades deben ser números no negativos",
            });
            setIsSubmitting(false);
            return;
        }

        // Permitir 0 personas solo si es asistencias o conferencia y el usuario o colíder asistió
        const canHaveZeroCount =
            (modalType === "asistencias" || modalType === "conferencia") &&
            (formData.attended === true ||
                (formData.coLeaderId && formData.coLeaderAttended === true));

        if (
            formData.maleCount === 0 &&
            formData.femaleCount === 0 &&
            formData.kidsCount === 0 &&
            !canHaveZeroCount
        ) {
            setErrors({
                count: "Debes registrar al menos una persona",
            });
            setIsSubmitting(false);
            return;
        }

        // Validar colíder si hay personas del sexo opuesto SOLO si hay colíderes disponibles
        // Si no hay colíderes disponibles, se permite registrar personas del sexo opuesto sin colíder
        const userGender = dashboard?.user.gender;
        const oppositeGenderCount =
            userGender === "Male" ? formData.femaleCount : formData.maleCount;
        if (
            oppositeGenderCount > 0 &&
            !formData.coLeaderId &&
            coLeaders &&
            coLeaders.length > 0
        ) {
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
                sede: formData.sede || undefined,
                attended:
                    modalType === "asistencias" || modalType === "conferencia"
                        ? formData.attended
                        : undefined,
                maleCount: formData.maleCount,
                femaleCount: formData.femaleCount,
                kidsCount: formData.kidsCount,
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
                <div className="animate-spin h-12 w-12 border-2 border-black border-t-transparent"></div>
            </div>
        );
    }

    const currentReport = periodReport;
    const currentGroupReport = periodGroupReport;

    return (
        <div className="min-h-screen bg-[#fafafa] p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header con filtro de periodo a la derecha */}
                <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
                    <h1 className="text-2xl font-normal text-black tracking-tight">
                        Dashboard
                    </h1>

                    {/* Filtro de periodo en la parte superior derecha */}
                    <div className="flex flex-1 md:flex-none md:flex-row flex-col md:items-center justify-end gap-3 bg-white border border-[#e5e5e5] p-3">
                        {/* Selector de modo Mes/Año */}
                        <div className="flex flex-1 items-center border border-[#e5e5e5]">
                            <button
                                onClick={() => handleViewModeChange("month")}
                                className={`flex-1 px-3 py-2 text-sm font-normal transition-colors border-r border-[#e5e5e5] last:border-r-0 ${
                                    viewMode === "month"
                                        ? "bg-black text-white"
                                        : "bg-white text-black hover:bg-[#fafafa]"
                                }`}
                            >
                                Mes
                            </button>
                            <button
                                onClick={() => handleViewModeChange("year")}
                                className={`flex-1 px-3 py-2 text-sm font-normal transition-colors border-r border-[#e5e5e5] last:border-r-0 ${
                                    viewMode === "year"
                                        ? "bg-black text-white"
                                        : "bg-white text-black hover:bg-[#fafafa]"
                                }`}
                            >
                                Año
                            </button>
                        </div>

                        {/* Navegación de período */}
                        <div className="flex flex-1 items-center gap-2">
                            <button
                                onClick={handlePreviousPeriod}
                                className="flex-1 flex items-center justify-center p-2 hover:bg-[#fafafa] transition-colors border border-[#e5e5e5]"
                                title="Período anterior"
                            >
                                <HiChevronLeft className="h-5 w-5 text-black" />
                            </button>
                            <span className="flex-3 text-sm font-normal text-black min-w-[140px] text-center px-3 py-2 bg-white border border-[#e5e5e5]">
                                {viewMode === "month" && selectedMonth
                                    ? `${monthNames[selectedMonth - 1]} ${selectedYear}`
                                    : `${selectedYear}`}
                            </span>
                            <button
                                onClick={handleNextPeriod}
                                className="flex-1 flex items-center justify-center p-2 hover:bg-[#fafafa] transition-colors border border-[#e5e5e5] disabled:opacity-50 disabled:cursor-not-allowed"
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
                                            ? "text-[#999999]"
                                            : "text-black"
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>
                {/* Contadores Personales */}
                <div className="mb-8">
                    <div className="mb-4">
                        <h2 className="text-lg font-normal text-black">
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
                            total={currentReport?.nuevos.total || 0}
                            maleCount={currentReport?.nuevos.male || 0}
                            femaleCount={currentReport?.nuevos.female || 0}
                            kidsCount={currentReport?.nuevos.kids}
                            onRegister={() => handleOpenModal("nuevos")}
                        />

                        <RegistrationCard
                            title="Asistencias"
                            description="Asistencia y nuevos"
                            icon={HiCalendar}
                            total={currentReport?.asistencias.total || 0}
                            maleCount={currentReport?.asistencias.male || 0}
                            femaleCount={currentReport?.asistencias.female || 0}
                            kidsCount={currentReport?.asistencias.kids}
                            onRegister={() => handleOpenModal("asistencias")}
                        />

                        <RegistrationCard
                            title="RESET"
                            description="Personas enviadas"
                            icon={HiUsers}
                            total={currentReport?.reset.total || 0}
                            maleCount={currentReport?.reset.male || 0}
                            femaleCount={currentReport?.reset.female || 0}
                            kidsCount={currentReport?.reset.kids}
                            onRegister={() => handleOpenModal("reset")}
                        />

                        <RegistrationCard
                            title="Conferencia"
                            description="Asistencia y nuevos"
                            icon={HiCalendar}
                            total={currentReport?.conferencia.total || 0}
                            maleCount={currentReport?.conferencia.male || 0}
                            femaleCount={currentReport?.conferencia.female || 0}
                            kidsCount={currentReport?.conferencia.kids}
                            onRegister={() => handleOpenModal("conferencia")}
                        />
                    </div>
                </div>

                {/* Reportes seccionados (Solo para Líderes) */}
                {currentGroupReport?.isLeader && (
                    <div className="mb-8">
                        <h2 className="text-lg font-normal text-black mb-4">
                            Reportes seccionados
                        </h2>

                        {/* Dropdowns de filtro */}
                        <div className="bg-white border border-[#e5e5e5] p-4 mb-4">
                            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                                {/* Dropdown de grupos */}
                                {userGroups && userGroups.length > 0 && (
                                    <div className="flex items-center gap-3 flex-1">
                                        <label className="text-xs font-normal text-black uppercase tracking-wide whitespace-nowrap">
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
                                                className="appearance-none bg-white border border-[#e5e5e5] px-4 py-3 pr-10 text-sm font-normal text-black hover:border-black focus:outline-none focus:border-black transition-colors cursor-pointer w-full"
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
                                            <HiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999999] pointer-events-none" />
                                        </div>
                                    </div>
                                )}

                                {/* Dropdown de discípulos */}
                                {disciples && disciples.length > 0 && (
                                    <div className="flex items-center gap-3 flex-1">
                                        <label className="text-xs font-normal text-black uppercase tracking-wide whitespace-nowrap">
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
                                                className="appearance-none bg-white border border-[#e5e5e5] px-4 py-3 pr-10 text-sm font-normal text-black hover:border-black focus:outline-none focus:border-black transition-colors cursor-pointer w-full"
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
                                            <HiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999999] pointer-events-none" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white border border-[#e5e5e5] p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Nuevos - Grupo */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-2 bg-blue-50">
                                            <HiUsers className="h-4 w-4 text-blue-700" />
                                        </div>
                                        <h3 className="font-normal text-black text-sm">
                                            Registro de Nuevos
                                        </h3>
                                    </div>
                                    <div className="text-2xl font-normal text-black mb-2">
                                        {currentGroupReport.groupReport?.nuevos
                                            .total || 0}
                                    </div>
                                    <div className="text-xs text-black">
                                        <div className="flex gap-3 text-xs mt-2 font-normal flex-wrap">
                                            <div className="text-black flex items-center">
                                                <MdMan className="h-4 w-4" />
                                                {currentGroupReport.groupReport
                                                    ?.nuevos.male || 0}{" "}
                                                hombres
                                            </div>
                                            <div className="text-black flex items-center">
                                                <MdWoman className="h-4 w-4" />
                                                {currentGroupReport.groupReport
                                                    ?.nuevos.female || 0}{" "}
                                                mujeres
                                            </div>
                                            {((currentGroupReport.groupReport
                                                ?.nuevos as { kids?: number })?.kids || 0) > 0 && (
                                                <div className="text-black flex items-center">
                                                    👶{" "}
                                                    {(currentGroupReport
                                                        .groupReport?.nuevos as { kids?: number })
                                                        ?.kids || 0}{" "}
                                                    niños
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Asistencias - Grupo */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-2 bg-green-50">
                                            <HiCalendar className="h-4 w-4 text-green-700" />
                                        </div>
                                        <h3 className="font-normal text-black text-sm">
                                            Registro de Asistencias
                                        </h3>
                                    </div>
                                    <div className="text-2xl font-normal text-black mb-2">
                                        {currentGroupReport.groupReport
                                            ?.asistencias.total || 0}
                                    </div>
                                    <div className="text-xs text-[#666666]">
                                        <div className="flex gap-3 text-xs mt-2 font-normal flex-wrap">
                                            <div className="text-black flex items-center">
                                                <MdMan className="h-4 w-4" />
                                                {currentGroupReport.groupReport
                                                    ?.asistencias.male ||
                                                    0}{" "}
                                                hombres
                                            </div>
                                            <div className="text-black flex items-center">
                                                <MdWoman className="h-4 w-4" />
                                                {currentGroupReport.groupReport
                                                    ?.asistencias.female ||
                                                    0}{" "}
                                                mujeres
                                            </div>
                                            {((currentGroupReport.groupReport
                                                ?.asistencias as { kids?: number })?.kids || 0) >
                                                0 && (
                                                <div className="text-black flex items-center">
                                                    <LuBaby className="h-4 w-4" />
                                                    {(currentGroupReport
                                                        .groupReport
                                                        ?.asistencias as { kids?: number })
                                                        ?.kids ||
                                                        0}{" "}
                                                    niños
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* RESET - Grupo */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-2 bg-purple-50">
                                            <HiUsers className="h-4 w-4 text-purple-700" />
                                        </div>
                                        <h3 className="font-normal text-black text-sm">
                                            RESET
                                        </h3>
                                    </div>
                                    <div className="text-2xl font-normal text-black mb-2">
                                        {currentGroupReport.groupReport?.reset
                                            .total || 0}
                                    </div>
                                    <div className="text-xs text-[#666666]">
                                        <div className="flex gap-3 text-xs mt-2 font-normal flex-wrap">
                                            <div className="text-black flex items-center">
                                                <MdMan className="h-4 w-4" />
                                                {currentGroupReport.groupReport
                                                    ?.reset.male || 0}{" "}
                                                hombres
                                            </div>
                                            <div className="text-black flex items-center">
                                                <MdWoman className="h-4 w-4" />
                                                {currentGroupReport.groupReport
                                                    ?.reset.female || 0}{" "}
                                                mujeres
                                            </div>
                                            {((currentGroupReport.groupReport
                                                ?.reset as { kids?: number })?.kids || 0) > 0 && (
                                                <div className="text-black flex items-center">
                                                    <LuBaby className="h-4 w-4" />
                                                    {(currentGroupReport
                                                        .groupReport?.reset as { kids?: number })
                                                        ?.kids || 0}{" "}
                                                    niños
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Conferencia - Grupo */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-2 bg-orange-50">
                                            <HiCalendar className="h-4 w-4 text-orange-700" />
                                        </div>
                                        <h3 className="font-normal text-black text-sm">
                                            Conferencia
                                        </h3>
                                    </div>
                                    <div className="text-2xl font-normal text-black mb-2">
                                        {currentGroupReport.groupReport
                                            ?.conferencia.total || 0}
                                    </div>
                                    <div className="text-xs text-[#666666]">
                                        <div className="flex gap-3 text-xs mt-2 font-normal flex-wrap">
                                            <div className="text-black flex items-center">
                                                <MdMan className="h-4 w-4" />
                                                {currentGroupReport.groupReport
                                                    ?.conferencia.male ||
                                                    0}{" "}
                                                hombres
                                            </div>
                                            <div className="text-black flex items-center">
                                                <MdWoman className="h-4 w-4" />
                                                {currentGroupReport.groupReport
                                                    ?.conferencia.female ||
                                                    0}{" "}
                                                mujeres
                                            </div>
                                            {((currentGroupReport.groupReport
                                                ?.conferencia as { kids?: number })?.kids || 0) >
                                                0 && (
                                                <div className="text-black flex items-center">
                                                    <LuBaby className="h-4 w-4" />
                                                    {(currentGroupReport
                                                        .groupReport
                                                        ?.conferencia as { kids?: number })
                                                        ?.kids ||
                                                        0}{" "}
                                                    niños
                                                </div>
                                            )}
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
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Fecha */}
                            <div>
                                <label className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
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
                                    className={`block w-full px-4 py-3 border bg-white text-black focus:outline-none focus:border-black transition-colors ${
                                        errors.date
                                            ? "border-[#d32f2f]"
                                            : "border-[#e5e5e5]"
                                    }`}
                                    required
                                />
                                {errors.date && (
                                    <p className="mt-2 text-xs text-[#d32f2f]">
                                        {errors.date}
                                    </p>
                                )}
                            </div>

                            {/* Servicio (solo para nuevos y asistencias) */}
                            {(modalType === "nuevos" ||
                                modalType === "asistencias") && (
                                <div>
                                    <label className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
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
                                        className={`block w-full px-4 py-3 border bg-white text-black focus:outline-none focus:border-black transition-colors ${
                                            errors.service
                                                ? "border-[#d32f2f]"
                                                : "border-[#e5e5e5]"
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
                                        <p className="mt-2 text-xs text-[#d32f2f]">
                                            {errors.service}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Sede */}
                            <div>
                                <label className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
                                    Sede
                                </label>
                                <select
                                    value={formData.sede || ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            sede: e.target.value
                                                ? (e.target
                                                      .value as typeof formData.sede)
                                                : null,
                                        })
                                    }
                                    className={`block w-full px-4 py-3 border bg-white text-black focus:outline-none focus:border-black transition-colors ${
                                        errors.sede
                                            ? "border-[#d32f2f]"
                                            : "border-[#e5e5e5]"
                                    }`}
                                >
                                    <option value="">
                                        Selecciona una sede
                                    </option>
                                    <option value="CENTRAL">CENTRAL</option>
                                    <option value="LINCE">LINCE</option>
                                    <option value="LOS OLIVOS">
                                        LOS OLIVOS
                                    </option>
                                    <option value="SJM">SJM</option>
                                    <option value="VMT">VMT</option>
                                    <option value="PACHACAMAC">
                                        PACHACAMAC
                                    </option>
                                    <option value="SJL">SJL</option>
                                    <option value="CHORRILLOS">
                                        CHORRILLOS
                                    </option>
                                    <option value="SURCO">SURCO</option>
                                    <option value="MIRAFLORES">
                                        MIRAFLORES
                                    </option>
                                    <option value="VES">VES</option>
                                </select>
                                {errors.sede && (
                                    <p className="mt-2 text-xs text-[#d32f2f]">
                                        {errors.sede}
                                    </p>
                                )}
                            </div>

                            {/* Asistencia (solo para asistencias y conferencia) */}
                            {(modalType === "asistencias" ||
                                modalType === "conferencia") && (
                                <>
                                    <div>
                                        <label className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
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
                                                    className="w-4 h-4 text-black"
                                                />
                                                <span className="text-sm font-normal text-black">
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
                                                    className="w-4 h-4 text-black"
                                                />
                                                <span className="text-sm font-normal text-black">
                                                    No
                                                </span>
                                            </label>
                                        </div>
                                        {errors.attended && (
                                            <p className="mt-2 text-xs text-[#d32f2f]">
                                                {errors.attended}
                                            </p>
                                        )}
                                    </div>

                                    {/* Sección del colíder para asistencias y conferencia */}
                                    {coLeaders && coLeaders.length > 0 && (
                                        <div className="space-y-3 p-4 bg-[#fafafa] border border-[#e5e5e5]">
                                            <div className="text-xs font-normal text-black uppercase tracking-wide">
                                                Colíder
                                            </div>

                                            {/* Selector de colíder si hay más de uno */}
                                            {coLeaders.length > 1 && (
                                                <div>
                                                    <label className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
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
                                                        className="block w-full px-4 py-3 border border-[#e5e5e5] bg-white text-black focus:outline-none focus:border-black transition-colors"
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
                                                    <label className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
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
                                                                className="w-4 h-4 text-black"
                                                            />
                                                            <span className="text-sm font-normal text-black">
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
                                                                className="w-4 h-4 text-black"
                                                            />
                                                            <span className="text-sm font-normal text-black">
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
                                <label className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
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
                                    className={`block w-full px-4 py-3 border bg-white text-black focus:outline-none focus:border-black transition-colors ${
                                        errors.count
                                            ? "border-[#d32f2f]"
                                            : "border-[#e5e5e5]"
                                    }`}
                                    required
                                />
                            </div>

                            {/* Cantidad de Mujeres */}
                            <div>
                                <label className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
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
                                    className={`block w-full px-4 py-3 border bg-white text-black focus:outline-none focus:border-black transition-colors ${
                                        errors.count
                                            ? "border-[#d32f2f]"
                                            : "border-[#e5e5e5]"
                                    }`}
                                    required
                                />
                                {errors.count && (
                                    <p className="mt-2 text-xs text-[#d32f2f]">
                                        {errors.count}
                                    </p>
                                )}
                            </div>

                            {/* Cantidad de Niños */}
                            <div>
                                <label className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
                                    Cantidad de Niños
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.kidsCount}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            kidsCount:
                                                parseInt(e.target.value) || 0,
                                        })
                                    }
                                    className={`block w-full px-4 py-3 border bg-white text-black focus:outline-none focus:border-black transition-colors ${
                                        errors.count
                                            ? "border-[#d32f2f]"
                                            : "border-[#e5e5e5]"
                                    }`}
                                    required
                                />
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
                                        <label className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
                                            Colíder
                                            <span className="text-[#d32f2f] ml-1">
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
                                            className={`block w-full px-4 py-3 border bg-white text-black focus:outline-none focus:border-black transition-colors ${
                                                errors.coLeader
                                                    ? "border-[#d32f2f]"
                                                    : "border-[#e5e5e5]"
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
                                            <p className="mt-2 text-xs text-[#d32f2f]">
                                                {errors.coLeader}
                                            </p>
                                        )}
                                    </div>
                                )}

                            {/* Error general */}
                            {errors.submit && (
                                <div className="p-3 bg-[#ffebee] border border-[#ffcdd2]">
                                    <p className="text-xs text-[#d32f2f]">
                                        {errors.submit}
                                    </p>
                                </div>
                            )}

                            {/* Botones */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 py-3 px-4 border border-[#e5e5e5] text-black font-normal text-sm hover:bg-[#fafafa] transition-colors"
                                    disabled={isSubmitting}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 px-4 bg-black text-white font-normal text-sm hover:bg-[#333333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black"
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
