import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { HiGlobeAlt, HiUsers, HiAcademicCap, HiUserGroup, HiPlus, HiPencil, HiTrash, HiX, HiSearch } from "react-icons/hi";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import type { Id } from "../../convex/_generated/dataModel";

const Grid = () => {
  const profile = useQuery(api.users.getMyProfile);
  
  // Verificar que el usuario sea admin o pastor
  if (profile === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-12 w-12 border-2 border-black border-t-transparent"></div>
      </div>
    );
  }

  // Si es admin, mostrar vista de todas las redes
  if (profile.isAdmin) {
    return <AdminGridView />;
  }

  // Si es pastor, mostrar vista de su red
  if (profile.role === "Pastor") {
    return <PastorGridView />;
  }

  // Si no es admin ni pastor, mostrar mensaje de acceso denegado
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="bg-white border border-[#e5e5e5] p-12 text-center">
        <h3 className="text-lg font-normal text-black mb-3 tracking-tight">
          Acceso Denegado
        </h3>
        <p className="text-sm font-normal text-[#666666]">
          Solo los administradores y pastores pueden acceder a esta sección.
        </p>
      </div>
    </div>
  );
};

// Vista para administradores: muestra todas las redes
function AdminGridView() {
  const grids = useQuery(api.grids.getAllGrids);
  const pastors = useQuery(api.users.getPastors);
  const createGrid = useMutation(api.grids.createGridForAdmin);
  const updateGrid = useMutation(api.grids.updateGridForAdmin);
  const deleteGrid = useMutation(api.grids.deleteGrid);
  const addMember = useMutation(api.grids.addMemberToGridForAdmin);
  const removeMember = useMutation(api.grids.removeMemberFromGridForAdmin);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModal, setIsCreateModal] = useState(false);
  const [editingGrid, setEditingGrid] = useState<Id<"grids"> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", pastorId: "" as Id<"users"> | "" });
  
  // Estados para agregar miembros
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedGridId, setSelectedGridId] = useState<Id<"grids"> | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchResults = useQuery(
    api.users.searchUsersByEmail,
    memberSearch.length >= 2 ? { searchTerm: memberSearch } : "skip"
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenCreateModal = () => {
    setIsCreateModal(true);
    setEditingGrid(null);
    setFormData({ name: "", pastorId: "" });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (grid: { _id: Id<"grids">; name: string }) => {
    setIsCreateModal(false);
    setEditingGrid(grid._id);
    setFormData({ name: grid.name, pastorId: "" });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsCreateModal(false);
    setEditingGrid(null);
    setFormData({ name: "", pastorId: "" });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    if (!formData.name || formData.name.trim().length < 2) {
      setErrors({ name: "El nombre debe tener al menos 2 caracteres" });
      setIsSubmitting(false);
      return;
    }

    if (isCreateModal && !formData.pastorId) {
      setErrors({ pastorId: "Debes seleccionar un pastor" });
      setIsSubmitting(false);
      return;
    }

    try {
      if (isCreateModal) {
        await createGrid({
          name: formData.name.trim(),
          pastorId: formData.pastorId as Id<"users">,
        });
      } else if (editingGrid) {
        await updateGrid({
          gridId: editingGrid,
          name: formData.name.trim(),
        });
      }
      handleCloseModal();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al guardar la red";
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (gridId: Id<"grids">) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta red? Esta acción removerá a todos los miembros de la red.")) {
      return;
    }

    try {
      await deleteGrid({ gridId });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al eliminar la red");
    }
  };

  const handleOpenAddMemberModal = (gridId: Id<"grids">) => {
    setSelectedGridId(gridId);
    setMemberEmail("");
    setMemberSearch("");
    setErrors({});
    setShowAddMemberModal(true);
  };

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedGridId) return;

    setIsSubmitting(true);
    setErrors({});

    if (!memberEmail || !memberEmail.trim()) {
      setErrors({ email: "Debes ingresar un email" });
      setIsSubmitting(false);
      return;
    }

    try {
      await addMember({
        gridId: selectedGridId,
        userEmail: memberEmail.trim(),
      });
      setShowAddMemberModal(false);
      setMemberEmail("");
      setMemberSearch("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al agregar miembro";
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (gridId: Id<"grids">, memberId: Id<"users">) => {
    if (!confirm("¿Estás seguro de que quieres remover a este miembro de la red?")) {
      return;
    }

    try {
      await removeMember({ gridId, memberId });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al remover miembro");
    }
  };

  if (grids === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-12 w-12 border-2 border-black border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Redes"
        description="Gestiona todas las redes de la plataforma"
        button={
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 bg-black text-white py-3 px-6 font-normal text-sm hover:bg-[#333333] transition-colors"
          >
            <HiPlus className="h-5 w-5" />
            Crear Red
          </button>
        }
      />

      {grids.length === 0 ? (
        <div className="bg-white border border-[#e5e5e5] p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black mb-6">
            <HiGlobeAlt className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-normal text-black mb-3 tracking-tight">
            No hay redes creadas
          </h3>
          <p className="text-sm font-normal text-[#666666]">
            Las redes serán creadas por los pastores.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {grids.map((grid) => (
            <GridCard
              key={grid._id}
              grid={grid}
              isAdmin={true}
              onEdit={() => handleOpenEditModal(grid)}
              onDelete={() => handleDelete(grid._id)}
              onAddMember={() => handleOpenAddMemberModal(grid._id)}
              onRemoveMember={(memberId) => handleRemoveMember(grid._id, memberId)}
            />
          ))}
        </div>
      )}

      {/* Modal para crear/editar red */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isCreateModal ? "Crear Red" : "Editar Red"}
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
              Nombre de la Red *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                setErrors({ ...errors, name: "" });
              }}
              className={`block w-full px-4 py-3 border bg-white text-black placeholder-[#999999] focus:outline-none focus:border-black transition-colors ${
                errors.name
                  ? "border-[#d32f2f]"
                  : "border-[#e5e5e5]"
              }`}
              placeholder="Ej: Red Norte"
              required
            />
            {errors.name && <p className="mt-2 text-xs text-[#d32f2f]">{errors.name}</p>}
          </div>

          {isCreateModal && (
            <div>
              <label htmlFor="pastorId" className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
                Asignar a Pastor *
              </label>
              <select
                id="pastorId"
                value={formData.pastorId}
                onChange={(e) => {
                  setFormData({ ...formData, pastorId: e.target.value as Id<"users"> | "" });
                  setErrors({ ...errors, pastorId: "" });
                }}
                className={`block w-full px-4 py-3 border bg-white text-black focus:outline-none focus:border-black transition-colors ${
                  errors.pastorId
                    ? "border-[#d32f2f]"
                    : "border-[#e5e5e5]"
                }`}
                required={isCreateModal}
              >
                <option value="">Selecciona un pastor</option>
                {pastors?.map((pastor) => (
                  <option key={pastor._id} value={pastor._id}>
                    {pastor.name || pastor.email} {pastor.email ? `(${pastor.email})` : ""}
                  </option>
                ))}
              </select>
              {errors.pastorId && <p className="mt-2 text-xs text-[#d32f2f]">{errors.pastorId}</p>}
              {pastors?.length === 0 && (
                <p className="mt-2 text-xs font-normal text-[#666666]">No hay pastores disponibles</p>
              )}
            </div>
          )}

          {errors.submit && (
            <div className="bg-[#ffebee] border border-[#ffcdd2] p-3">
              <p className="text-xs text-[#d32f2f]">{errors.submit}</p>
            </div>
          )}

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
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-black text-white font-normal text-sm hover:bg-[#333333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black"
            >
              {isSubmitting ? (isCreateModal ? "Creando..." : "Guardando...") : (isCreateModal ? "Crear Red" : "Guardar Cambios")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal para agregar miembro */}
      <Modal
        isOpen={showAddMemberModal}
        onClose={() => {
          setShowAddMemberModal(false);
          setMemberEmail("");
          setMemberSearch("");
          setErrors({});
        }}
        title="Agregar Miembro a la Red"
        maxWidth="xl"
      >
        <form onSubmit={handleAddMember} className="space-y-6">
          <div className="relative" ref={searchRef}>
            <label htmlFor="memberEmail" className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
              Email del Usuario *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <HiSearch className="h-4 w-4 text-[#999999]" />
              </div>
              <input
                id="memberEmail"
                type="text"
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setMemberEmail(e.target.value);
                  setShowSearchResults(true);
                  setErrors({ ...errors, email: "" });
                }}
                className={`block w-full pl-10 pr-3 py-3 border bg-white text-black placeholder-[#999999] focus:outline-none focus:border-black transition-colors ${
                  errors.email
                    ? "border-[#d32f2f]"
                    : "border-[#e5e5e5]"
                }`}
                placeholder="Buscar por email..."
                required
              />
            </div>
            {errors.email && <p className="mt-2 text-xs text-[#d32f2f]">{errors.email}</p>}
            
            {/* Resultados de búsqueda */}
            {showSearchResults && searchResults && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-[#e5e5e5] max-h-60 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user._id}
                    type="button"
                    onClick={() => {
                      setMemberEmail(user.email || "");
                      setMemberSearch(user.email || "");
                      setShowSearchResults(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-[#fafafa] transition-colors border-b border-[#e5e5e5] last:border-b-0"
                  >
                    <p className="text-sm font-normal text-black">{user.name || "Sin nombre"}</p>
                    <p className="text-xs font-normal text-[#666666]">{user.email}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {errors.submit && (
            <div className="bg-[#ffebee] border border-[#ffcdd2] p-3">
              <p className="text-xs text-[#d32f2f]">{errors.submit}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowAddMemberModal(false);
                setMemberEmail("");
                setMemberSearch("");
                setErrors({});
              }}
              className="flex-1 py-3 px-4 border border-[#e5e5e5] text-black font-normal text-sm hover:bg-[#fafafa] transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-black text-white font-normal text-sm hover:bg-[#333333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black"
            >
              {isSubmitting ? "Agregando..." : "Agregar Miembro"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Vista para pastores: muestra solo su red
function PastorGridView() {
  const myGrid = useQuery(api.grids.getMyGrid);
  const members = useQuery(api.grids.getGridMembers);
  const stats = useQuery(api.grids.getGridStats);
  const updateGrid = useMutation(api.grids.updateGrid);
  const addMember = useMutation(api.grids.addMemberToGrid);
  const removeMember = useMutation(api.grids.removeMemberFromGrid);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "" });
  const [memberEmail, setMemberEmail] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchResults = useQuery(
    api.users.searchUsersByEmail,
    memberSearch.length >= 2 ? { searchTerm: memberSearch } : "skip"
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenEditModal = () => {
    if (!myGrid) return;
    setFormData({ name: myGrid.name });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ name: "" });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!myGrid) return;

    setIsSubmitting(true);
    setErrors({});

    if (!formData.name || formData.name.trim().length < 2) {
      setErrors({ name: "El nombre debe tener al menos 2 caracteres" });
      setIsSubmitting(false);
      return;
    }

    try {
      await updateGrid({
        gridId: myGrid._id,
        name: formData.name.trim(),
      });
      handleCloseModal();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al guardar la red";
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    if (!memberEmail || !memberEmail.trim()) {
      setErrors({ email: "Debes ingresar un email" });
      setIsSubmitting(false);
      return;
    }

    try {
      await addMember({
        userEmail: memberEmail.trim(),
      });
      setShowAddMemberModal(false);
      setMemberEmail("");
      setMemberSearch("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al agregar miembro";
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: Id<"users">) => {
    if (!confirm("¿Estás seguro de que quieres remover a este miembro de tu red?")) {
      return;
    }

    try {
      await removeMember({ memberId });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al remover miembro");
    }
  };

  if (myGrid === undefined || members === undefined || stats === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-12 w-12 border-2 border-black border-t-transparent"></div>
      </div>
    );
  }

  // Si no tiene red, mostrar mensaje informativo
  if (!myGrid) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Mi Red"
          description="Gestiona tu red y sus miembros"
        />

        <div className="bg-white border border-[#e5e5e5] p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black mb-6">
            <HiGlobeAlt className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-normal text-black mb-3 tracking-tight">
            No tienes una red asignada
          </h3>
          <p className="text-sm font-normal text-[#666666]">
            Contacta a un administrador para que te asigne una red.
          </p>
        </div>
      </div>
    );
  }

  // Si tiene red, mostrar información y opciones de edición
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi Red"
        description="Gestiona tu red y sus miembros"
        button={
          <div className="flex gap-3">
            <button
              onClick={handleOpenEditModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-normal text-black bg-white border border-[#e5e5e5] hover:bg-[#fafafa] transition-colors"
            >
              <HiPencil className="h-4 w-4" />
              Editar Red
            </button>
            <button
              onClick={() => setShowAddMemberModal(true)}
              className="inline-flex items-center gap-2 bg-black text-white py-3 px-6 font-normal text-sm hover:bg-[#333333] transition-colors"
            >
              <HiPlus className="h-5 w-5" />
              Agregar Miembro
            </button>
          </div>
        }
      />

      <GridCard
        grid={myGrid}
        members={members}
        stats={stats}
        isAdmin={false}
        onRemoveMember={handleRemoveMember}
      />

      {/* Modal para editar red */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Editar Mi Red"
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
              Nombre de la Red *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                setErrors({ ...errors, name: "" });
              }}
              className={`block w-full px-4 py-3 border bg-white text-black placeholder-[#999999] focus:outline-none focus:border-black transition-colors ${
                errors.name
                  ? "border-[#d32f2f]"
                  : "border-[#e5e5e5]"
              }`}
              placeholder="Ej: Red Norte"
              required
            />
            {errors.name && <p className="mt-2 text-xs text-[#d32f2f]">{errors.name}</p>}
          </div>

          {errors.submit && (
            <div className="bg-[#ffebee] border border-[#ffcdd2] p-3">
              <p className="text-xs text-[#d32f2f]">{errors.submit}</p>
            </div>
          )}

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
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-black text-white font-normal text-sm hover:bg-[#333333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black"
            >
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal para agregar miembro */}
      <Modal
        isOpen={showAddMemberModal}
        onClose={() => {
          setShowAddMemberModal(false);
          setMemberEmail("");
          setMemberSearch("");
          setErrors({});
        }}
        title="Agregar Miembro a Mi Red"
        maxWidth="xl"
      >
        <form onSubmit={handleAddMember} className="space-y-6">
          <div className="relative" ref={searchRef}>
            <label htmlFor="memberEmail" className="block text-xs font-normal text-black mb-2 uppercase tracking-wide">
              Email del Usuario *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <HiSearch className="h-4 w-4 text-[#999999]" />
              </div>
              <input
                id="memberEmail"
                type="text"
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setMemberEmail(e.target.value);
                  setShowSearchResults(true);
                  setErrors({ ...errors, email: "" });
                }}
                className={`block w-full pl-10 pr-3 py-3 border bg-white text-black placeholder-[#999999] focus:outline-none focus:border-black transition-colors ${
                  errors.email
                    ? "border-[#d32f2f]"
                    : "border-[#e5e5e5]"
                }`}
                placeholder="Buscar por email..."
                required
              />
            </div>
            {errors.email && <p className="mt-2 text-xs text-[#d32f2f]">{errors.email}</p>}
            
            {/* Resultados de búsqueda */}
            {showSearchResults && searchResults && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-[#e5e5e5] max-h-60 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user._id}
                    type="button"
                    onClick={() => {
                      setMemberEmail(user.email || "");
                      setMemberSearch(user.email || "");
                      setShowSearchResults(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-[#fafafa] transition-colors border-b border-[#e5e5e5] last:border-b-0"
                  >
                    <p className="text-sm font-normal text-black">{user.name || "Sin nombre"}</p>
                    <p className="text-xs font-normal text-[#666666]">{user.email}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {errors.submit && (
            <div className="bg-[#ffebee] border border-[#ffcdd2] p-3">
              <p className="text-xs text-[#d32f2f]">{errors.submit}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowAddMemberModal(false);
                setMemberEmail("");
                setMemberSearch("");
                setErrors({});
              }}
              className="flex-1 py-3 px-4 border border-[#e5e5e5] text-black font-normal text-sm hover:bg-[#fafafa] transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-black text-white font-normal text-sm hover:bg-[#333333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black"
            >
              {isSubmitting ? "Agregando..." : "Agregar Miembro"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Componente de tarjeta de red
function GridCard({
  grid,
  members,
  stats,
  isAdmin,
  onEdit,
  onDelete,
  onAddMember,
  onRemoveMember,
}: {
  grid: {
    _id: Id<"grids">;
    name: string;
    pastor?: { name?: string; email?: string } | null;
  };
  members?: Array<{
    _id: Id<"users">;
    name?: string;
    email?: string;
  }>;
  stats?: {
    totalMembers: number;
    membersInSchool: number;
    totalGroups: number;
    maleCount: number;
    femaleCount: number;
  };
  isAdmin: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddMember?: () => void;
  onRemoveMember?: (memberId: Id<"users">) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Si es admin, obtener datos con queries
  const adminMembers = useQuery(
    api.grids.getGridMembersForAdmin,
    isExpanded && isAdmin && grid._id ? { gridId: grid._id } : "skip"
  );
  const adminStats = useQuery(
    api.grids.getGridStatsForAdmin,
    isExpanded && isAdmin && grid._id ? { gridId: grid._id } : "skip"
  );

  const displayMembers = isAdmin ? adminMembers : members;
  const displayStats = isAdmin ? adminStats : stats;

  return (
    <div className="bg-white border border-[#e5e5e5] p-6  transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-50">
              <HiGlobeAlt className="h-5 w-5 text-blue-700" />
            </div>
            <h3 className="text-xl font-normal text-black tracking-tight">{grid.name}</h3>
          </div>
          {grid.pastor && (
            <div className="mt-2">
              <p className="text-sm font-normal text-[#666666]">
                <span className="text-black">Pastor:</span> {grid.pastor.name || grid.pastor.email}
              </p>
              {grid.pastor.email && (
                <p className="text-xs font-normal text-[#999999]">{grid.pastor.email}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Botones de acción para admin */}
      {isAdmin && (onEdit || onDelete || onAddMember) && (
        <div className="flex gap-2 mb-4 pt-4 border-t border-[#e5e5e5]">
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-normal text-black bg-white border border-[#e5e5e5] hover:bg-[#fafafa] transition-colors"
            >
              <HiPencil className="h-4 w-4" />
              Editar
            </button>
          )}
          {onAddMember && (
            <button
              onClick={onAddMember}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-normal text-black bg-white border border-[#e5e5e5] hover:bg-[#fafafa] transition-colors"
            >
              <HiPlus className="h-4 w-4" />
              Agregar
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-normal text-black bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
            >
              <HiTrash className="h-4 w-4" />
              Eliminar
            </button>
          )}
        </div>
      )}

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full mt-4 px-4 py-2 text-sm font-normal text-black bg-white border border-[#e5e5e5] hover:bg-[#fafafa] transition-colors"
      >
        {isExpanded ? "Ocultar detalles" : "Ver detalles"}
      </button>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-[#e5e5e5] space-y-4">
          {displayStats && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <HiUsers className="h-4 w-4 text-blue-700" />
                  <p className="text-xs font-normal text-[#666666]">Miembros</p>
                </div>
                <p className="text-2xl font-normal text-black">{displayStats.totalMembers}</p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <HiAcademicCap className="h-4 w-4 text-blue-700" />
                  <p className="text-xs font-normal text-[#666666]">En Escuela</p>
                </div>
                <p className="text-2xl font-normal text-black">{displayStats.membersInSchool}</p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <HiUserGroup className="h-4 w-4 text-blue-700" />
                  <p className="text-xs font-normal text-[#666666]">Grupos</p>
                </div>
                <p className="text-2xl font-normal text-black">{displayStats.totalGroups}</p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <HiUsers className="h-4 w-4 text-blue-700" />
                  <p className="text-xs font-normal text-[#666666]">Hombres/Mujeres</p>
                </div>
                <p className="text-sm font-normal text-black">
                  {displayStats.maleCount} / {displayStats.femaleCount}
                </p>
              </div>
            </div>
          )}

          {displayMembers && displayMembers.length > 0 && (
            <div>
              <h4 className="text-sm font-normal text-black mb-2 uppercase tracking-wide">
                Miembros ({displayMembers.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {displayMembers.map((member: { _id: Id<"users">; name?: string; email?: string }) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between p-2 bg-[#fafafa] border border-[#e5e5e5]"
                  >
                    <div className="flex-1">
                      <p className="font-normal text-black text-sm">
                        {member.name || "Sin nombre"}
                      </p>
                      <p className="text-xs font-normal text-[#666666]">{member.email}</p>
                    </div>
                    {onRemoveMember && (
                      <button
                        onClick={() => onRemoveMember(member._id)}
                        className="ml-2 p-1 text-black hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                        title="Remover miembro"
                      >
                        <HiX className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Grid;
