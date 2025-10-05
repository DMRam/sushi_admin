import React from "react";
import { useProducts } from "../context/ProductsContext";
import { useIngredients } from "../context/IngredientsContext";
import { productCost } from "../utils/costCalculations";

export const CostAnalysisPage = () => {
  const { products } = useProducts();
  const { ingredients } = useIngredients();

  const totalProducts = products.length;
  const productsWithPrice = products.filter((p) => p.sellingPrice).length;
  const averageMargin =
    products.length > 0
      ? products.reduce((acc, p) => acc + (p.profitMargin || 0), 0) /
        products.length
      : 0;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Cost Analysis Dashboard
        </h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900">
              Total Products
            </h3>
            <p className="text-3xl font-bold text-blue-700">{totalProducts}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-green-900">
              Products with Pricing
            </h3>
            <p className="text-3xl font-bold text-green-700">
              {productsWithPrice}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h3 className="text-lg font-semibold text-purple-900">
              Average Margin
            </h3>
            <p className="text-3xl font-bold text-purple-700">
              {averageMargin.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const cost = productCost(product, ingredients);
            const profit = product.sellingPrice
              ? product.sellingPrice - cost
              : 0;
            const margin = product.sellingPrice
              ? (profit / product.sellingPrice) * 100
              : 0;

            return (
              <div
                key={product.id}
                className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
              >
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  {product.name}
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost Price:</span>
                    <span className="font-medium">${cost.toFixed(2)}</span>
                  </div>

                  {product.sellingPrice ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Selling Price:</span>
                        <span className="font-medium">
                          ${product.sellingPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Profit:</span>
                        <span
                          className={`font-medium ${
                            profit >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          ${profit.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Margin:</span>
                        <span
                          className={`font-medium ${
                            margin >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {margin.toFixed(1)}%
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-orange-600 text-sm font-medium">
                      No selling price set
                    </div>
                  )}
                </div>

                {product.portionSize && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className="text-xs text-gray-500">
                      Portion: {product.portionSize}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {products.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <div className="text-lg mb-2">No products yet</div>
            <div className="text-sm">
              Create some products to see cost analysis
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
