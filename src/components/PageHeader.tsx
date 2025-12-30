import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  button?: ReactNode;
}

export default function PageHeader({ title, description, button }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-600">{description}</p>
      </div>
      {button && <div>{button}</div>}
    </div>
  );
}

