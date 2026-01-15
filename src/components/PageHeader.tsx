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
        <h1 className="text-2xl font-normal text-black tracking-tight">{title}</h1>
        <p className="mt-3 text-sm font-normal text-[#666666]">{description}</p>
      </div>
      {button && <div>{button}</div>}
    </div>
  );
}

