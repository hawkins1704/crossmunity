import { Password } from "@convex-dev/auth/providers/Password";
import type { DataModel } from "./_generated/dataModel";
import type { Id } from "./_generated/dataModel";
 
export default Password<DataModel>({
  profile(params) {
    // Convertir birthdate de string (YYYY-MM-DD) a timestamp si está presente
    let birthdate: number | undefined = undefined;
    if (params.birthdate) {
      const dateString = params.birthdate as string;
      const [year, month, day] = dateString.split("-").map(Number);
      const date = new Date(year, month - 1, day, 0, 0, 0, 0);
      birthdate = date.getTime();
    }

    return {
      email: params.email as string,
      name: params.name as string,
      role: params.role as "Pastor" | "Member",
      gender: params.gender as "Male" | "Female",
      gridId: params.gridId ? (params.gridId as Id<"grids">) : undefined, // Opcional por ahora pero requerido en frontend
      birthdate: birthdate,
      isActiveInSchool: false,
      isAdmin: false, // Por defecto false al registrarse
    };
  },
});