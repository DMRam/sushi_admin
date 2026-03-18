// import type { PagesManagerProps } from '../types'

// export default function PagesManager({
//   pages,
//   editingPage,
//   setEditingPage,
//   savePage,
//   loading,
//   getPageName,
// }: PagesManagerProps) {
//   return (
//     <div className="space-y-6">
//       {editingPage ? (
//         <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
//           <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">
//             EDIT {getPageName(editingPage.pageId).toUpperCase()}
//           </h3>

//           <div className="space-y-4">
//             <div>
//               <label className="block text-sm font-light text-gray-700 mb-2">
//                 Page Title
//               </label>
//               <input
//                 type="text"
//                 value={editingPage.title}
//                 onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-light text-gray-700 mb-2">
//                 Page Description
//               </label>
//               <input
//                 type="text"
//                 value={editingPage.description || ''}
//                 onChange={(e) => setEditingPage({ ...editingPage, description: e.target.value })}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-light text-gray-700 mb-2">
//                 Content
//               </label>
//               <textarea
//                 value={editingPage.content}
//                 onChange={(e) => setEditingPage({ ...editingPage, content: e.target.value })}
//                 rows={12}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
//                 placeholder="Enter your page content here..."
//               />
//             </div>

//             <div className="flex items-center">
//               <input
//                 type="checkbox"
//                 id="pageActive"
//                 checked={editingPage.isActive}
//                 onChange={(e) => setEditingPage({ ...editingPage, isActive: e.target.checked })}
//                 className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
//               />
//               <label htmlFor="pageActive" className="ml-2 block text-sm text-gray-700 font-light">
//                 Page is active and visible to visitors
//               </label>
//             </div>

//             <div className="flex space-x-3">
//               <button
//                 onClick={() => void savePage(editingPage)}
//                 disabled={loading}
//                 className={`px-6 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-light ${
//                   loading
//                     ? 'bg-gray-400 cursor-not-allowed text-white'
//                     : 'bg-gray-900 hover:bg-gray-800 text-white'
//                 }`}
//               >
//                 {loading ? 'SAVING...' : 'SAVE PAGE'}
//               </button>

//               <button
//                 onClick={() => setEditingPage(null)}
//                 className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-light"
//               >
//                 CANCEL
//               </button>
//             </div>
//           </div>
//         </div>
//       ) : (
//         <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
//           <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">WEBSITE PAGES</h3>

//           <div className="sm:hidden space-y-3">
//             {pages.map((page) => (
//               <div key={page.pageId} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
//                 <div className="flex justify-between items-start mb-3">
//                   <div>
//                     <div className="font-light text-gray-900 text-sm mb-1">{page.title}</div>
//                     <div className="text-xs text-gray-500 font-light">
//                       {getPageName(page.pageId)}
//                     </div>
//                   </div>

//                   <span
//                     className={`inline-flex px-2 py-1 text-xs font-light rounded-full ${
//                       page.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
//                     }`}
//                   >
//                     {page.isActive ? 'Active' : 'Inactive'}
//                   </span>
//                 </div>

//                 <div className="text-xs text-gray-600 mb-3 font-light line-clamp-2">
//                   {page.description}
//                 </div>

//                 <div className="flex space-x-2">
//                   <button
//                     onClick={() => setEditingPage(page)}
//                     className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm font-light hover:bg-blue-700"
//                   >
//                     EDIT
//                   </button>
//                 </div>
//               </div>
//             ))}
//           </div>

//           <div className="hidden sm:block overflow-x-auto">
//             <table className="min-w-full divide-y divide-gray-200">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
//                     Page
//                   </th>
//                   <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
//                     Title
//                   </th>
//                   <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
//                     Status
//                   </th>
//                   <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
//                     Last Updated
//                   </th>
//                   <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
//                     Actions
//                   </th>
//                 </tr>
//               </thead>

//               <tbody className="bg-white divide-y divide-gray-200">
//                 {pages.map((page) => (
//                   <tr key={page.pageId} className="hover:bg-gray-50">
//                     <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-light text-gray-900">
//                       {getPageName(page.pageId)}
//                     </td>
//                     <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-light">
//                       {page.title}
//                     </td>
//                     <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
//                       <span
//                         className={`inline-flex px-3 py-1 text-xs font-light rounded-full ${
//                           page.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
//                         }`}
//                       >
//                         {page.isActive ? 'Active' : 'Inactive'}
//                       </span>
//                     </td>
//                     <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-light">
//                       {page.lastUpdated?.toLocaleDateString()}
//                     </td>
//                     <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
//                       <button
//                         onClick={() => setEditingPage(page)}
//                         className="text-blue-600 hover:text-blue-900 font-light"
//                       >
//                         Edit
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }