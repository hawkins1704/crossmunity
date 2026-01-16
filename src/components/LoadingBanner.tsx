
const LoadingBanner = () => {
  return (
    <div className="flex items-center justify-center gap-4 h-[100vh] bg-[#fafafa]">
        <div className="animate-spin h-12 w-12 border-2 border-black border-t-transparent"></div>
        <p className="text-sm font-normal text-[#666666]">Cargando...</p>
    </div>
  )
}

export default LoadingBanner