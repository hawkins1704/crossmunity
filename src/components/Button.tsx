import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  rounded?: "full" | "xl";
  fullWidth?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  rounded = "full",
  fullWidth = false,
  icon,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = "inline-flex justify-center items-center gap-2 font-medium transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
  
  const variantClasses = {
    primary: "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-lg hover:shadow-xl",
    secondary: "bg-white border-2 border-sky-300 text-sky-600 hover:bg-sky-50 shadow-sm hover:shadow-md",
    outline: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
  };
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  
  const roundedClasses = {
    full: "rounded-full",
    xl: "rounded-xl",
  };
  
  const widthClass = fullWidth ? "w-full" : "";
  
  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${roundedClasses[rounded]}
    ${widthClass}
    ${className}
  `.trim().replace(/\s+/g, " ");

  return (
    <button
      className={classes}
      disabled={disabled}
      {...props}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}

