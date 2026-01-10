

const LoadingBanner = () => {
  return (
    <div className="flex items-center justify-center  h-[100vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="text-gray-500">Cargando...</p>
    </div>
  )
}

export default LoadingBanner