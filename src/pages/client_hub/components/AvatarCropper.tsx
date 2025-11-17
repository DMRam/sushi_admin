import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface AvatarCropperProps {
    image: File;
    onCropComplete: (croppedImageUrl: string) => void;
    onCancel: () => void;
}

export const AvatarCropper: React.FC<AvatarCropperProps> = ({
    image,
    onCropComplete,
    onCancel
}) => {
    const [crop, setCrop] = useState<Crop>({
        unit: '%',
        width: 50,
        height: 50,
        x: 25,
        y: 25,
    });
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [imageUrl, setImageUrl] = useState<string>('');
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Create image URL when component mounts
    useEffect(() => {
        console.log('🖼️ Creating image URL for cropper...');
        const url = URL.createObjectURL(image);
        setImageUrl(url);
        console.log('🖼️ Image URL created:', url);

        return () => {
            console.log('🖼️ Cleaning up image URL');
            URL.revokeObjectURL(url);
        };
    }, [image]);

    // Simple zoom controls
    const zoomIn = () => setScale(prev => Math.min(3, prev + 0.2));
    const zoomOut = () => setScale(prev => Math.max(0.5, prev - 0.2));
    const resetZoom = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    // Mouse panning
    const [isDragging, setIsDragging] = useState(false);
    const lastMousePos = useRef<{ x: number; y: number } | null>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Only allow panning when clicking on the image background, not crop handles
        const target = e.target as HTMLElement;
        if (e.button === 0 && target.tagName === 'IMG' && !target.closest('.ReactCrop__drag-handle')) {
            setIsDragging(true);
            lastMousePos.current = { x: e.clientX, y: e.clientY };
            e.preventDefault();
        }
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isDragging && lastMousePos.current) {
            const deltaX = e.clientX - lastMousePos.current.x;
            const deltaY = e.clientY - lastMousePos.current.y;

            setPosition(prev => ({
                x: prev.x + deltaX,
                y: prev.y + deltaY
            }));

            lastMousePos.current = { x: e.clientX, y: e.clientY };
        }
    }, [isDragging]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        lastMousePos.current = null;
    }, []);

    // Mouse wheel zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const zoomIntensity = 0.1;
        const wheel = e.deltaY < 0 ? 1 : -1;
        const zoom = Math.exp(wheel * zoomIntensity);
        
        setScale(prev => Math.max(0.5, Math.min(3, prev * zoom)));
    }, []);

    const getCroppedImg = async (): Promise<string> => {
        console.log('✂️ Starting image cropping...');
        if (!imgRef.current || !completedCrop) {
            throw new Error('Crop canvas does not exist');
        }

        const image = imgRef.current;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('No 2d context');
        }

        // Get the actual image dimensions (not affected by CSS transforms)
        const naturalWidth = image.naturalWidth;
        const naturalHeight = image.naturalHeight;
        const displayedWidth = image.width;
        const displayedHeight = image.height;

        // Calculate the scale factors
        const scaleX = naturalWidth / displayedWidth;
        const scaleY = naturalHeight / displayedHeight;

        // Convert percentage crop to pixel values
        const pixelCrop = {
            x: (completedCrop.x / 100) * displayedWidth,
            y: (completedCrop.y / 100) * displayedHeight,
            width: (completedCrop.width / 100) * displayedWidth,
            height: (completedCrop.height / 100) * displayedHeight,
        };

        // Set canvas size to crop dimensions
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        // Draw the cropped portion
        ctx.drawImage(
            image,
            pixelCrop.x * scaleX,
            pixelCrop.y * scaleY,
            pixelCrop.width * scaleX,
            pixelCrop.height * scaleY,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Canvas is empty'));
                    return;
                }
                const url = URL.createObjectURL(blob);
                console.log('✅ Cropped image created:', url);
                resolve(url);
            }, 'image/jpeg', 0.9);
        });
    };

    const handleCropComplete = async () => {
        try {
            console.log('🔄 Completing crop...');
            const croppedImageUrl = await getCroppedImg();
            onCropComplete(croppedImageUrl);
        } catch (error) {
            console.error('❌ Error cropping image:', error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Crop Your Avatar</h3>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={zoomOut}
                            className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            −
                        </button>
                        <span className="text-sm w-16 text-center">
                            {Math.round(scale * 100)}%
                        </span>
                        <button
                            onClick={zoomIn}
                            className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            +
                        </button>
                        <button
                            onClick={resetZoom}
                            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors ml-2"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                <div
                    ref={containerRef}
                    className="mb-4 relative overflow-hidden bg-gray-100 rounded-lg border-2 border-gray-300"
                    style={{
                        maxHeight: '500px',
                        minHeight: '300px',
                        cursor: isDragging ? 'grabbing' : 'grab'
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                >
                    {imageUrl ? (
                        <div
                            style={{
                                transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
                                transformOrigin: 'center center',
                                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative'
                            }}
                        >
                            <ReactCrop
                                crop={crop}
                                onChange={(_, percentCrop) => setCrop(percentCrop)}
                                onComplete={(c) => {
                                    console.log('🎯 Crop completed:', c);
                                    setCompletedCrop(c);
                                }}
                                aspect={1}
                                circularCrop
                                keepSelection
                                ruleOfThirds
                                className="max-h-full"
                                style={{
                                    position: 'relative',
                                    zIndex: 10
                                }}
                            >
                                <img
                                    ref={imgRef}
                                    src={imageUrl}
                                    alt="Crop me"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        display: 'block',
                                        userSelect: 'none',
                                        pointerEvents: 'auto'
                                    }}
                                    draggable={false}
                                    onLoad={() => {
                                        // Reset to initial state when image loads
                                        setScale(1);
                                        setPosition({ x: 0, y: 0 });
                                        setCrop({
                                            unit: '%',
                                            width: 50,
                                            height: 50,
                                            x: 25,
                                            y: 25,
                                        });
                                    }}
                                />
                            </ReactCrop>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                            <span className="ml-2 text-gray-600">Loading image...</span>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <div className="text-sm text-gray-600 text-center">
                        <p>💻 <strong>Adjust crop:</strong> Drag the circular handles to resize the selection</p>
                        <p>🔍 <strong>Zoom:</strong> Use +/- buttons or mouse wheel</p>
                        <p>🖱️ <strong>Pan:</strong> Click and drag the image background to move it</p>
                    </div>

                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCropComplete}
                            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!completedCrop}
                        >
                            Use This Photo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};