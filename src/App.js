import React, { useState, useRef, useEffect } from 'react';

// Componente principal de la aplicación
const App = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [formatText, setFormatText] = useState('');
    const [progress, setProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState('');
    const [errorLog, setErrorLog] = useState([]);
    const [processedHtmlContent, setProcessedHtmlContent] = useState('');
    const [docxBase64, setDocxBase64] = useState('');

    // Manejador global de errores para capturar y registrar cualquier fallo
    useEffect(() => {
        const handleError = (event) => {
            const errorInfo = {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error ? event.error.stack : 'No stack trace available'
            };
            console.error('Error capturado globalmente:', errorInfo);
            setErrorLog(prev => [...prev, errorInfo]);
            setMessage('Se ha producido un error. Por favor, revisa el registro de errores.');
        };

        window.addEventListener('error', handleError);
        return () => {
            window.removeEventListener('error', handleError);
        };
    }, []);

    // Manejador para cuando el usuario selecciona un archivo
    const handleFileChange = (event) => {
        try {
            const file = event.target.files[0];
            if (file && file.name.endsWith('.docx')) {
                setSelectedFile(file);
                setMessage(`Archivo seleccionado: ${file.name}`);
                setErrorLog([]); 
                setProcessedHtmlContent(''); 
                setDocxBase64(''); // Limpiar el Base64 al seleccionar un nuevo archivo
            } else {
                setSelectedFile(null);
                setMessage('Por favor, selecciona un archivo .docx válido.');
                throw new Error('Tipo de archivo no válido. Solo se permiten .docx');
            }
        } catch (error) {
            const errorInfo = {
                message: error.message,
                stack: error.stack,
                context: 'handleFileChange'
            };
            console.error('Error en handleFileChange:', errorInfo);
            setErrorLog(prev => [...prev, errorInfo]);
            setMessage('Error al seleccionar el archivo.');
        }
    };

    const handleFormatTextChange = (event) => {
        setFormatText(event.target.value);
    };

    // Función principal para enviar el archivo al backend y manejar la respuesta
    const handleProcessDocument = async () => {
        if (!selectedFile) {
            setMessage('Por favor, primero selecciona un archivo de Word.');
            return;
        }
        if (!formatText.trim()) {
            setMessage('Por favor, especifica qué quieres remover o cambiar.');
            return;
        }

        setIsProcessing(true);
        setProgress(0);
        setMessage('Procesando documento...');
        setErrorLog([]); 
        setProcessedHtmlContent(''); 
        setDocxBase64('');

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('format_text', formatText);

            // Llamada al backend de Python alojado en Render
            const response = await fetch('https://formateador-de-web-app.onrender.com/process-document', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error desconocido al procesar el documento.');
            }

            const result = await response.json();

            // Guardar el contenido HTML y el Base64 para la previsualización y descarga
            setProcessedHtmlContent(result.html_content);
            setDocxBase64(result.docx_base64);

            setMessage('Documento procesado exitosamente. Ahora puedes previsualizar y descargar.');
            setProgress(100);

        } catch (error) {
            const errorInfo = {
                message: error.message,
                stack: error.stack,
                context: 'handleProcessDocument'
            };
            console.error('Error durante el procesamiento:', errorInfo);
            setErrorLog(prev => [...prev, errorInfo]);
            setMessage(`Error al procesar el documento: ${error.message}. Revisa el registro de errores.`);
            setProgress(0);
        } finally {
            setIsProcessing(false);
        }
    };

    // Función para descargar el archivo a partir del Base64
    const handleDownload = () => {
        try {
            if (!docxBase64) {
                setMessage('No hay un documento para descargar.');
                return;
            }
            // Decodificar el Base64 y crear el Blob
            const docxBytes = Uint8Array.from(atob(docxBase64), c => c.charCodeAt(0));
            const blob = new Blob([docxBytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            const url = URL.createObjectURL(blob);
            
            // Crear y activar el enlace de descarga
            const link = document.createElement('a');
            link.href = url;
            link.download = selectedFile.name.replace('.docx', '_v1.docx');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url); // Liberar la URL del objeto
            setMessage('La descarga ha comenzado. ¡Revisa tu carpeta de descargas!');
        } catch (error) {
            console.error('Error al descargar el archivo:', error);
            setMessage('Error al descargar el archivo. Por favor, inténtalo de nuevo.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 flex items-center justify-center font-sans">
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet" />

            <style>
                {`
                body { font-family: 'Inter', sans-serif; }
                @keyframes fillProgress { from { width: 0%; } to { width: var(--progress-width); } }
                .progress-bar-fill { animation: fillProgress 0.5s ease-out forwards; }
                .html-preview-container {
                    background-color: #1f2937;
                    border: 1px solid #4b5563;
                    border-radius: 0.75rem;
                    padding: 1.5rem;
                    max-height: 400px;
                    overflow-y: auto;
                    white-space: pre-wrap; 
                    font-family: 'Inter', sans-serif;
                    color: #e5e7eb;
                }
                .html-preview-container p { margin-bottom: 0.5rem; }
                
                .file-input-label {
                  background-color: #4f46e5;
                  color: white;
                  cursor: pointer;
                  transition: background-color 0.3s;
                }
                .file-input-label:hover {
                  background-color: #4338ca;
                }
                `}
            </style>

            <div className="bg-gray-800 p-8 md:p-12 rounded-2xl shadow-lg w-full max-w-3xl border border-gray-700">
                <h1 className="text-4xl md:text-5xl font-extrabold text-center text-white mb-4">
                    <i className="fas fa-file-word text-blue-500 mr-3"></i>
                    <span className="text-blue-400">Formateador</span> de Word
                </h1>
                <p className="text-center text-gray-400 mb-10 text-lg">
                    Sube un documento y describe los cambios de formato que deseas.
                </p>

                <div className="space-y-8">
                    {/* Sección para subir archivo */}
                    <div className="bg-gray-700 p-6 rounded-xl border-t-4 border-blue-500">
                        <label htmlFor="file-upload" className="block text-xl font-semibold text-gray-200 mb-4">
                            1. Sube tu archivo Word (.docx)
                        </label>
                        <label className="file-input-label block w-full py-4 px-6 rounded-lg text-lg font-bold text-center">
                            <input
                                id="file-upload"
                                type="file"
                                accept=".docx"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            {selectedFile ? (
                                <span><i className="fas fa-check-circle mr-2"></i> {selectedFile.name}</span>
                            ) : (
                                <span><i className="fas fa-upload mr-2"></i> Elegir Archivo</span>
                            )}
                        </label>
                    </div>

                    {/* Sección para describir formato */}
                    <div className="bg-gray-700 p-6 rounded-xl border-t-4 border-purple-500">
                        <label htmlFor="format-text" className="block text-xl font-semibold text-gray-200 mb-4">
                            2. Describe qué quieres remover o cambiar
                        </label>
                        <textarea
                            id="format-text"
                            value={formatText}
                            onChange={handleFormatTextChange}
                            rows="4"
                            placeholder="Ejemplo: Eliminar líneas que contengan 'Confidencial', cambiar el tamaño de fuente a 12 en todo el documento."
                            className="w-full p-4 border border-gray-600 rounded-lg bg-gray-800 text-gray-200
                                       focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none
                                       transition duration-200 ease-in-out resize-y"
                        ></textarea>
                    </div>

                    {/* Botón de procesamiento */}
                    <button
                        onClick={handleProcessDocument}
                        disabled={isProcessing || !selectedFile || !formatText.trim()}
                        className={`w-full py-4 px-6 rounded-lg text-white font-bold text-xl transition duration-300 ease-in-out transform hover:scale-105
                                    ${isProcessing ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-lg'}`}
                    >
                        {isProcessing ? (
                            <>
                                <i className="fas fa-spinner fa-spin mr-2"></i> Procesando...
                            </>
                        ) : (
                            <span><i className="fas fa-magic mr-2"></i> Procesar Documento</span>
                        )}
                    </button>
                </div>

                {/* Mensajes de estado */}
                {isProcessing && (
                    <div className="mt-8">
                        <div className="text-center text-sm font-medium text-gray-400 mb-2">
                            Progreso: {progress}%
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3">
                            <div
                                className="bg-green-500 h-3 rounded-full progress-bar-fill"
                                style={{ '--progress-width': `${progress}%`, width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {message && (
                    <p className={`mt-8 p-4 rounded-lg text-center font-medium ${message.includes('Error') ? 'bg-red-900 text-red-300' : 'bg-blue-900 text-blue-300'}`}>
                        {message}
                    </p>
                )}

                {/* Previsualización y descarga */}
                {processedHtmlContent && (
                    <div className="mt-8 space-y-6">
                        <h2 className="text-2xl font-bold text-white mb-4">
                            <i className="fas fa-eye text-yellow-400 mr-2"></i> Resultados
                        </h2>
                        
                        {/* Previsualización HTML */}
                        <div>
                            <h3 className="text-xl font-semibold text-gray-200 mb-2">Previsualización del Documento:</h3>
                            <div
                                className="html-preview-container"
                                dangerouslySetInnerHTML={{ __html: processedHtmlContent }}
                            ></div>
                        </div>

                        {/* Contenido Base64 y descarga */}
                        <div>
                            <h3 className="text-xl font-semibold text-gray-200 mb-2">Contenido Base64 del Documento:</h3>
                            <p className="text-gray-400 text-sm mb-3">
                                Esta es la representación de tu documento. Si esta cadena es larga, el servidor lo procesó correctamente.
                            </p>
                            <textarea
                                readOnly
                                value={docxBase64}
                                rows="5"
                                className="w-full p-4 border border-gray-600 rounded-lg bg-gray-800 text-gray-200 text-xs
                                           outline-none resize-y"
                                placeholder="El contenido Base64 del documento aparecerá aquí..."
                            ></textarea>
                            
                            <div className="mt-4 text-center">
                                <button
                                    onClick={handleDownload}
                                    className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-10 rounded-lg shadow-lg
                                               transition duration-300 ease-in-out transform hover:scale-105"
                                >
                                    <i className="fas fa-download mr-2"></i> Descargar Documento v1
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
