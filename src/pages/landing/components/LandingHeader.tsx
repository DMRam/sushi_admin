import { Link } from 'react-router-dom'

export const LandingHeader = () => {
    return (
        <header className="bg-white border-b border-gray-100">
            <div className="container mx-auto px-6 py-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
                            <span className="text-white text-lg font-light">P</span>
                        </div>
                        <div className="text-left">
                            <h1 className="text-2xl font-light text-gray-900 tracking-tight">Pacifique</h1>
                            <p className="text-xs text-gray-500 font-light tracking-wider">CEVICHE | SUSHI BAR</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Link
                            to="/admin-login"
                            className="text-gray-600 hover:text-gray-900 px-4 py-2 text-sm font-light tracking-wide transition-colors duration-300"
                        >
                            Management
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    )
}
