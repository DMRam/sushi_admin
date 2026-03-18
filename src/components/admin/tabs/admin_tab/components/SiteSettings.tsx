// import type { SiteSettingsProps } from '../types'

// export default function SiteSettings({
//   config,
//   onChange,
//   onSave,
//   loading,
// }: SiteSettingsProps) {
//   return (
//     <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
//       <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">SITE SETTINGS</h3>

//       <div className="space-y-6">
//         <div>
//           <label className="block text-sm font-light text-gray-700 mb-2">
//             Site Title
//           </label>
//           <input
//             type="text"
//             value={config.siteTitle}
//             onChange={(e) => onChange({ ...config, siteTitle: e.target.value })}
//             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-light text-gray-700 mb-2">
//             Site Description
//           </label>
//           <textarea
//             value={config.siteDescription}
//             onChange={(e) => onChange({ ...config, siteDescription: e.target.value })}
//             rows={3}
//             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-light text-gray-700 mb-2">
//             Contact Email
//           </label>
//           <input
//             type="email"
//             value={config.contactEmail}
//             onChange={(e) => onChange({ ...config, contactEmail: e.target.value })}
//             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
//           />
//         </div>

//         <div className="flex items-center">
//           <input
//             type="checkbox"
//             id="maintenanceMode"
//             checked={config.maintenanceMode}
//             onChange={(e) => onChange({ ...config, maintenanceMode: e.target.checked })}
//             className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
//           />
//           <label htmlFor="maintenanceMode" className="ml-2 block text-sm text-gray-700 font-light">
//             Enable Maintenance Mode
//           </label>
//         </div>

//         <button
//           onClick={onSave}
//           disabled={loading}
//           className={`px-6 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-light ${
//             loading
//               ? 'bg-gray-400 cursor-not-allowed text-white'
//               : 'bg-gray-900 hover:bg-gray-800 text-white'
//           }`}
//         >
//           {loading ? 'SAVING...' : 'SAVE SETTINGS'}
//         </button>
//       </div>
//     </div>
//   )
// }