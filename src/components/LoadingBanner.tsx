

const LoadingBanner = () => {
  return (
    <div className="flex items-center justify-center gap-4 h-[100vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        <p className="text-gray-500">Cargando...</p>
    </div>
  )
}

export default LoadingBanner