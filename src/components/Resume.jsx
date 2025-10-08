// src/components/Resume.jsx
import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from 'react-pdf';
import MotionSection from "./MotionSection";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function Resume() {
  const pdf = (import.meta.env.BASE_URL || '/') + "resume.pdf";
  const [pdfError, setPdfError] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [useIframe, setUseIframe] = useState(false);

  const onDocumentLoadSuccess = ({ numPages }) => {
    console.log('PDF loaded successfully:', { numPages, pdf });
    setNumPages(numPages);
    setPdfError(false);
  };

  const onDocumentLoadError = (error) => {
    console.error('PDF load error:', error);
    console.error('PDF path:', pdf);
    console.error('Full error details:', error);
    console.log('Falling back to iframe view...');
    setUseIframe(true);
    setPdfError(false); // Don't show error state, just switch to iframe
  };

  // Test PDF accessibility on component mount
  useEffect(() => {
    console.log('Testing PDF accessibility:', pdf);
    console.log('Base URL:', import.meta.env.BASE_URL);
    console.log('Full PDF URL:', window.location.origin + pdf);
    
    fetch(pdf, { method: 'HEAD' })
      .then(response => {
        console.log('PDF fetch response:', response.status, response.ok);
        if (!response.ok) {
          console.error('PDF not accessible, status:', response.status);
          setPdfError(true);
        } else {
          console.log('PDF is accessible!');
          setPdfError(false);
        }
      })
      .catch(error => {
        console.error('PDF fetch error:', error);
        setPdfError(true);
      });

    // Auto-fallback to iframe after a timeout if PDF viewer doesn't load
    const fallbackTimer = setTimeout(() => {
      if (!numPages && !pdfError) {
        console.log('PDF viewer taking too long, switching to iframe...');
        setUseIframe(true);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(fallbackTimer);
  }, [pdf, numPages, pdfError]);

  return (
    <MotionSection id="resume" className="max-w-6xl mx-auto px-4 py-16 md:py-20" aria-labelledby="resume-heading">
      <h2 id="resume-heading" className="text-3xl md:text-4xl font-bold tracking-tight gradient-heading mb-4">Resume</h2>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-12 max-w-2xl">
        Quick preview + one-click download.
      </p>

      {/* Mobile: link only */}
      <div className="mt-6 md:hidden rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-neutral-900/60 p-5">
        <a href={pdf} download className="rounded-full bg-indigo-600 px-5 py-2 text-white">
          Download Resume
        </a>
      </div>

      {/* Desktop: PDF viewer with buttons */}
      <div className="hidden lg:flex gap-8 items-start">
        <div className="flex-1 overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 
                        bg-white/90 dark:bg-neutral-900/80 backdrop-blur-xl shadow-lg">
        <div className="h-[900px] bg-gray-50 dark:bg-gray-800 flex flex-col">
          {/* Viewer toggle */}
          <div className="flex justify-center p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-900/50">
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1.5 shadow-inner">
              <button
                onClick={() => setUseIframe(false)}
                className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-300 ${
                  !useIframe 
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-md scale-105' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:scale-105'
                }`}
              >
                PDF Viewer
              </button>
              <button
                onClick={() => setUseIframe(true)}
                className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-300 ${
                  useIframe 
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-md scale-105' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:scale-105'
                }`}
              >
                Browser View
              </button>
            </div>
          </div>

          {pdfError ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="mb-6">
                  <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">PDF Preview Unavailable</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Click below to view or download the PDF
                </p>
                <div className="space-y-3">
                  <a 
                    href={pdf} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  >
                    View PDF in New Tab
                  </a>
                  <br />
                  <a 
                    href={pdf} 
                    download
                    className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    Download PDF
                  </a>
                </div>
              </div>
            </div>
          ) : useIframe ? (
            <div className="flex-1">
        <iframe
                src={pdf}
                className="w-full h-full"
          title="Ali Younes Resume"
                style={{ border: 'none' }}
                onLoad={() => console.log('Iframe loaded successfully')}
                onError={(e) => console.error('Iframe error:', e)}
              />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto p-4 bg-white dark:bg-gray-900">
                <div className="flex justify-center">
                  <Document
                    file={pdf}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                      <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <div className="text-gray-600 dark:text-gray-400">Loading PDF...</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                          If this takes too long, try Browser View
                        </div>
                        <button
                          onClick={() => setUseIframe(true)}
                          className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 
                                     bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 
                                     dark:hover:bg-indigo-900/30 transition-colors duration-200"
                        >
                          Switch to Browser View
                        </button>
                      </div>
                    }
                    className="pdf-document"
                    options={{
                      cMapUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/cmaps/`,
                      cMapPacked: true,
                    }}
                  >
                    <Page 
                      pageNumber={pageNumber} 
                      width={Math.min(800, window.innerWidth - 100)}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      className="pdf-page shadow-lg"
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: 'white'
                      }}
                    />
                  </Document>
                </div>
              </div>
              {numPages && numPages > 1 && (
                <div className="flex items-center justify-between p-6 border-t border-gray-200/50 dark:border-gray-700/50 
                                bg-white/50 dark:bg-gray-900/50 backdrop-blur">
                  <button
                    onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                    disabled={pageNumber <= 1}
                    className="group flex items-center gap-2 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 
                               bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl 
                               hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600
                               hover:scale-105 hover:shadow-md transition-all duration-300 
                               disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                  >
                    <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Page {pageNumber} of {numPages}
                    </span>
                  </div>
                  <button
                    onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                    disabled={pageNumber >= numPages}
                    className="group flex items-center gap-2 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 
                               bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl 
                               hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600
                               hover:scale-105 hover:shadow-md transition-all duration-300 
                               disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                  >
                    Next
                    <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        </div>

        {/* Button row for desktop */}
        <div className="flex flex-col gap-3 mt-4 lg:mt-0">
          <a
            href={pdf}
            download
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600
                       px-6 py-3 text-white font-medium shadow-lg hover:shadow-xl 
                       hover:translate-y-[-2px] transition-all duration-300
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </a>
          <a
            href={pdf}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 
                       px-6 py-3 font-medium text-gray-700 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600
                       hover:translate-y-[-1px] transition-all duration-300 shadow-sm hover:shadow-md
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open in New Tab
          </a>
        </div>
      </div>

      {/* Mobile/Tablet: PDF viewer */}
      <div className="mt-8 block lg:hidden overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 
                      bg-white/90 dark:bg-neutral-900/80 backdrop-blur-xl shadow-lg">
        <div className="h-[600px] bg-gray-50 dark:bg-gray-800 flex flex-col">
          {/* Viewer toggle */}
          <div className="flex justify-center p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-900/50">
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 shadow-inner">
              <button
                onClick={() => setUseIframe(false)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 ${
                  !useIframe 
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-md scale-105' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:scale-105'
                }`}
              >
                PDF Viewer
              </button>
              <button
                onClick={() => setUseIframe(true)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 ${
                  useIframe 
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-md scale-105' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:scale-105'
                }`}
              >
                Browser View
              </button>
            </div>
          </div>

          {pdfError ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-6">
                <div className="mb-4">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">PDF Preview Unavailable</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Click below to view or download the PDF
                </p>
                <div className="flex flex-col gap-2">
                  <a 
                    href={pdf} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                  >
                    View PDF in New Tab
                  </a>
                  <a 
                    href={pdf} 
                    download
                    className="inline-block bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                  >
                    Download PDF
                  </a>
                </div>
              </div>
            </div>
          ) : useIframe ? (
            <div className="flex-1">
              <iframe
                src={pdf}
                className="w-full h-full"
                title="Ali Younes Resume"
                style={{ border: 'none' }}
                onLoad={() => console.log('Iframe loaded successfully')}
                onError={(e) => console.error('Iframe error:', e)}
              />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto p-3 bg-white dark:bg-gray-900">
                <div className="flex justify-center">
                  <Document
                    file={pdf}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                      <div className="flex flex-col items-center justify-center h-48 space-y-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Loading PDF...</div>
                        <button
                          onClick={() => setUseIframe(true)}
                          className="px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 
                                     bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 
                                     dark:hover:bg-indigo-900/30 transition-colors duration-200"
                        >
                          Switch to Browser View
                        </button>
                      </div>
                    }
                    className="pdf-document"
                    options={{
                      cMapUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/cmaps/`,
                      cMapPacked: true,
                    }}
                  >
                    <Page 
                      pageNumber={pageNumber} 
                      width={Math.min(350, window.innerWidth - 50)}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      className="pdf-page shadow-lg"
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: 'white'
                      }}
                    />
                  </Document>
                </div>
              </div>
              {numPages && numPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-gray-200/50 dark:border-gray-700/50 
                                bg-white/50 dark:bg-gray-900/50 backdrop-blur">
                  <button
                    onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                    disabled={pageNumber <= 1}
                    className="group flex items-center gap-1 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 
                               bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg 
                               hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600
                               hover:scale-105 hover:shadow-md transition-all duration-300 
                               disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                  >
                    <svg className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {pageNumber} / {numPages}
                    </span>
                  </div>
                  <button
                    onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                    disabled={pageNumber >= numPages}
                    className="group flex items-center gap-1 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 
                               bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg 
                               hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600
                               hover:scale-105 hover:shadow-md transition-all duration-300 
                               disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                  >
                    Next
                    <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile button row */}
      <div className="mt-6 flex flex-wrap gap-3 lg:hidden">
        <a
          href={pdf}
          download
          className="flex-1 sm:flex-none group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600
                     px-6 py-3 text-white font-medium shadow-lg hover:shadow-xl 
                     hover:translate-y-[-2px] transition-all duration-300
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download PDF
        </a>
        <a
          href={pdf}
          target="_blank"
          rel="noreferrer"
          className="flex-1 sm:flex-none group inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 
                     px-6 py-3 font-medium text-gray-700 dark:text-gray-300
                     hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600
                     hover:translate-y-[-1px] transition-all duration-300 shadow-sm hover:shadow-md
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open in New Tab
        </a>
      </div>

      {/* Fallback note */}
      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        If the viewer doesn't load,{" "}
        <a className="underline hover:text-indigo-600 dark:hover:text-indigo-400" href={pdf} target="_blank" rel="noreferrer">open in a new tab</a>{" "}
        or <a className="underline hover:text-indigo-600 dark:hover:text-indigo-400" href={pdf} download>download</a>.
      </div>
    </MotionSection>
  );
}
