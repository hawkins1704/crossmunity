import { Password } from "@convex-dev/auth/providers/Password";
import type { DataModel } from "./_generated/dataModel";
import type { Id } from "./_generated/dataModel";
 
export default Password<DataModel>({
  profile(params) {
    return {
      email: params.email as string,
      name: params.name as string,
      role: params.role as "Pastor" | "Member",
      gender: params.gender as "Male" | "Female",
      gridId: params.gridId ? (params.gridId as Id<"grids">) : undefined, // Opcional por ahora pero requerido en frontend
      isActiveInSchool: false,
      isAdmin: false, // Por defecto false al registrarse
    };
  },
});