import React, { useState, useRef, useEffect } from 'react';

// Componente principal de la aplicación
const App = () => {
    // Estado para el archivo seleccionado
    const [selectedFile, setSelectedFile] = useState(null);
    // Estado para el texto de formato a remover/cambiar
    const [formatText, setFormatText] = useState('');
    // Estado para el progreso de la operación
    const [progress, setProgress] = useState(0);
    // Estado para indicar si la operación está en curso
    const [isProcessing, setIsProcessing] = useState(false);
    // Estado para el mensaje de estado o error
    const [message, setMessage] = useState('');
    // Estado para almacenar los errores capturados
    const [errorLog, setErrorLog] = useState([]);
    // Estado para el contenido HTML del documento procesado (para previsualización)
    const [processedHtmlContent, setProcessedHtmlContent] = useState('');
    // Referencia para el enlace de descarga
    const downloadLinkRef = useRef(null);

    // Efecto para configurar un manejador global de errores
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

        // Limpieza del manejador de eventos al desmontar el componente
        return () => {
            window.removeEventListener('error', handleError);
        };
    }, []);

    // Manejador de cambio de archivo
    const handleFileChange = (event) => {
        try {
            const file = event.target.files[0];
            if (file && file.name.endsWith('.docx')) {
                setSelectedFile(file);
                setMessage(`Archivo seleccionado: ${file.name}`);
                setErrorLog([]); // Limpiar errores al seleccionar nuevo archivo
                setProcessedHtmlContent(''); // Limpiar previsualización
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

    // Manejador de cambio de texto de formato
    const handleFormatTextChange = (event) => {
        setFormatText(event.target.value);
    };

    // Función para simular el progreso de la operación (ahora se usará con la llamada real)
    const updateProgress = (current, total) => {
        const percentage = Math.round((current / total) * 100);
        setProgress(percentage);
    };

    // Manejador del botón de procesar
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
        setErrorLog([]); // Limpiar errores antes de un nuevo procesamiento
        setProcessedHtmlContent(''); // Limpiar cualquier previsualización anterior

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('format_text', formatText);

            // Importante: La URL de tu backend en Render
            const backendUrl = 'https://formateador-de-web-app.onrender.com/process-document';
            
            const response = await fetch(backendUrl, {
                method: 'POST',
                body: formData,
                // No establezcas 'Content-Type' para FormData, el navegador lo hace automáticamente
            });

            if (!response.ok) {
                // Si la respuesta no es exitosa (ej. 400, 500)
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error desconocido al procesar el documento.');
            }

            // El backend enviará un JSON con el Base64 del DOCX y el HTML de previsualización
            const result = await response.json();

            // Decodificar el archivo DOCX de Base64
            const docxBytes = Uint8Array.from(atob(result.docx_base64), c => c.charCodeAt(0));
            const blob = new Blob([docxBytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            const url = URL.createObjectURL(blob);

            // Actualizar el enlace de descarga
            if (downloadLinkRef.current) {
                downloadLinkRef.current.href = url;
                const newFileName = selectedFile.name.replace('.docx', '_v1.docx');
                downloadLinkRef.current.download = newFileName;
            }

            // Establecer el contenido HTML para previsualización
            setProcessedHtmlContent(result.html_content);

            setMessage('Documento procesado exitosamente. ¡Listo para descargar y previsualizar!');
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center font-sans">
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

            <style>
                {`
                body {
                    font-family: 'Inter', sans-serif;
                }
                /* Animación para el progreso */
                @keyframes fillProgress {
                    from { width: 0%; }
                    to { width: var(--progress-width); }
                }
                .progress-bar-fill {
                    animation: fillProgress 0.5s ease-out forwards;
                }
                /* Estilos básicos para el contenido HTML previsualizado */
                .html-preview-container {
                    background-color: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5rem;
                    padding: 1rem;
                    max-height: 400px;
                    overflow-y: auto;
                    white-space: pre-wrap; /* Para preservar saltos de línea y espacios */
                    font-family: 'Inter', sans-serif;
                    color: #374151;
                }
                .html-preview-container p {
                    margin-bottom: 0.5rem;
                }
                `}
            </style>

            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200">
                <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">
                    <span className="text-blue-600">Formateador</span> de Documentos Word
                </h1>

                {/* Sección de Carga de Archivo */}
                <div className="mb-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
                    <label htmlFor="file-upload" className="block text-lg font-semibold text-gray-700 mb-3">
                        1. Sube tu archivo Word (.docx)
                    </label>
                    <input
                        id="file-upload"
                        type="file"
                        accept=".docx"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-900
                                   file:mr-4 file:py-2 file:px-4
                                   file:rounded-full file:border-0
                                   file:text-sm file:font-semibold
                                   file:bg-blue-500 file:text-white
                                   hover:file:bg-blue-600
                                   cursor-pointer rounded-lg border border-gray-300 p-2"
                    />
                    {selectedFile && (
                        <p className="mt-3 text-sm text-gray-600">
                            Archivo seleccionado: <span className="font-medium">{selectedFile.name}</span>
                        </p>
                    )}
                </div>

                {/* Sección de Opciones de Formato */}
                <div className="mb-6 p-6 bg-indigo-50 rounded-lg border border-indigo-200">
                    <label htmlFor="format-text" className="block text-lg font-semibold text-gray-700 mb-3">
                        2. ¿Qué quieres remover o cambiar?
                    </label>
                    <textarea
                        id="format-text"
                        value={formatText}
                        onChange={handleFormatTextChange}
                        rows="4"
                        placeholder="Ej: Remover líneas que contengan '_____', cambiar 'viejo' por 'nuevo', eliminar todos los saltos de página."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition duration-200 ease-in-out resize-y"
                    ></textarea>
                    <p className="mt-2 text-sm text-gray-500">
                        Describe claramente los cambios de formato que deseas.
                    </p>
                </div>

                {/* Botón de Procesar */}
                <button
                    onClick={handleProcessDocument}
                    disabled={isProcessing || !selectedFile || !formatText.trim()}
                    className={`w-full py-3 px-6 rounded-lg text-white font-semibold text-lg transition duration-300 ease-in-out
                                ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl'}`}
                >
                    {isProcessing ? 'Procesando...' : 'Procesar Documento'}
                </button>

                {/* Indicador de Progreso */}
                {isProcessing && (
                    <div className="mt-6">
                        <div className="text-center text-sm font-medium text-gray-700 mb-2">
                            Progreso: {progress}%
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-green-500 h-3 rounded-full progress-bar-fill"
                                style={{ '--progress-width': `${progress}%`, width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {/* Mensaje de Estado */}
                {message && (
                    <p className={`mt-6 p-3 rounded-lg text-center ${message.includes('Error') ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-blue-100 text-blue-700 border border-blue-300'}`}>
                        {message}
                    </p>
                )}

                {/* Contenido HTML Previsualizado */}
                {processedHtmlContent && (
                    <div className="mt-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-3">Previsualización del Documento Modificado:</h2>
                        <div
                            className="html-preview-container"
                            dangerouslySetInnerHTML={{ __html: processedHtmlContent }}
                        ></div>
                    </div>
                )}

                {/* Enlace de Descarga */}
                {progress === 100 && !isProcessing && selectedFile && (
                    <div className="mt-6 text-center">
                        <a
                            ref={downloadLinkRef}
                            href="#" // Se actualizará dinámicamente
                            className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition duration-300 ease-in-out"
                            download={selectedFile.name.replace('.docx', '_v1.docx')}
                        >
                            Descargar Documento v1
                        </a>
                    </div>
                )}

                {/* Registro de Errores */}
                {errorLog.length > 0 && (
                    <div className="mt-8 p-6 bg-red-50 rounded-lg border border-red-200">
                        <h2 className="text-xl font-bold text-red-800 mb-4">
                            <span className="text-red-600">Registro</span> de Errores (Frontend)
                        </h2>
                        <ul className="list-disc list-inside text-sm text-red-700 space-y-2">
                            {errorLog.map((err, index) => (
                                <li key={index} className="break-words">
                                    <p className="font-semibold">Mensaje: {err.message}</p>
                                    {err.context && <p>Contexto: {err.context}</p>}
                                    {err.filename && <p>Archivo: {err.filename} (Línea: {err.lineno}, Columna: {err.colno})</p>}
                                    {err.stack && (
                                        <details>
                                            <summary className="cursor-pointer text-red-600 hover:underline">Ver detalles del stack</summary>
                                            <pre className="mt-1 p-2 bg-red-100 rounded-md overflow-auto text-xs text-red-800">
                                                <code>{err.stack}</code>
                                            </pre>
                                        </details>
                                    )}
                                </li>
                            ))}
                        </ul>
                        <p className="mt-4 text-sm text-red-600">
                            Si el problema persiste, revisa también la consola del servidor Flask para errores de backend.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;

