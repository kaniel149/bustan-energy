import SolarInstallationScroll from '../components/SolarInstallationScroll'

export default function PreviewScroll() {
  return (
    <div className="bg-white min-h-screen">
      {/* Hero placeholder */}
      <div className="h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-4">How We Install Solar</h1>
          <p className="text-white/60">Scroll down to see the process</p>
        </div>
      </div>

      {/* The scroll animation section */}
      <SolarInstallationScroll />

      {/* CTA placeholder */}
      <div className="h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Go Solar?</h2>
          <button className="px-8 py-3 bg-yellow-500 text-black font-semibold rounded-full">
            Get Free Quote
          </button>
        </div>
      </div>
    </div>
  )
}
