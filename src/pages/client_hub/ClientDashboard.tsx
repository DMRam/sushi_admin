// components/ClientDashboard.tsx
export function ClientDashboard() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-light mb-8">Client Dashboard</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {/* Stats Cards */}
                    <div className="bg-white p-6 shadow-sm border border-gray-200">
                        <h3 className="text-lg font-light mb-2">Total Purchases</h3>
                        <p className="text-3xl font-light">$12,450</p>
                    </div>
                    <div className="bg-white p-6 shadow-sm border border-gray-200">
                        <h3 className="text-lg font-light mb-2">Orders This Month</h3>
                        <p className="text-3xl font-light">24</p>
                    </div>
                    <div className="bg-white p-6 shadow-sm border border-gray-200">
                        <h3 className="text-lg font-light mb-2">Favorite Items</h3>
                        <p className="text-3xl font-light">8</p>
                    </div>
                </div>

                {/* Simple Chart Placeholder */}
                <div className="bg-white p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-light mb-4">Purchase History</h3>
                    <div className="h-64 flex items-end justify-between space-x-2">
                        {/* Simple bar chart - replace with actual chart library later */}
                        {[40, 60, 75, 50, 85, 60, 45].map((height, index) => (
                            <div key={index} className="flex-1 flex flex-col items-center">
                                <div
                                    className="bg-gray-900 w-full max-w-12 transition-all duration-500"
                                    style={{ height: `${height}%` }}
                                ></div>
                                <span className="text-xs mt-2 text-gray-600">Week {index + 1}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}