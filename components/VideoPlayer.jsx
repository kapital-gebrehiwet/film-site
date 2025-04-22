'use client';
import { useState, useRef, useEffect, lazy, Suspense } from 'react';

// Lazy load the video player to improve initial page load
const VideoPlayer = ({ videoUrl, trailerUrl, title, posterPath }) => {
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  // Only mount the video player when it's in the viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsMounted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (videoRef.current) {
        observer.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    // Reset states when video URL changes
    setIsLoading(true);
    setError(null);
  }, [videoUrl, trailerUrl]);

  const handleVideoError = (e) => {
    console.error('Video error:', e);
    const videoElement = e.target;
    
    let errorMessage = 'Failed to load video. Please try again later.';
    
    // Provide more specific error messages based on error code
    if (videoElement.error) {
      switch (videoElement.error.code) {
        case 1:
          errorMessage = 'Video loading was aborted. Please try again.';
          break;
        case 2:
          errorMessage = 'Network error while loading video. Please check your connection.';
          break;
        case 3:
          errorMessage = 'Video decoding failed. The format may not be supported.';
          break;
        case 4:
          errorMessage = 'Video URL is not accessible. Please contact support.';
          break;
      }
    }
    
    setError(errorMessage);
    setIsLoading(false);
  };

  const handleVideoLoad = () => {
    setIsLoading(false);
  };

  if (!videoUrl && !trailerUrl) {
    return (
      <div className="w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <p className="text-white">No video available</p>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video bg-black rounded-lg overflow-hidden relative" ref={videoRef}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}
      
      {isMounted && (
        <>
      {isPlayingTrailer ? (
        <iframe
          src={trailerUrl}
          title={`${title} Trailer`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
              onLoad={handleVideoLoad}
              onError={handleVideoError}
              loading="lazy"
        />
      ) : (
        <video
              ref={videoRef}
          src={videoUrl}
          controls
          className="w-full h-full"
              poster={posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : undefined}
              onLoadedData={handleVideoLoad}
              onError={handleVideoError}
              crossOrigin="anonymous"
              preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
          )}
        </>
      )}
      
      {!isMounted && (
        <div className="w-full h-full flex items-center justify-center">
          <div className="animate-pulse bg-gray-700 w-full h-full"></div>
        </div>
      )}
      
      {trailerUrl && (
        <button
          onClick={() => setIsPlayingTrailer(!isPlayingTrailer)}
          className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-4 py-2 rounded hover:bg-opacity-75 z-20"
        >
          {isPlayingTrailer ? 'Watch Movie' : 'Watch Trailer'}
        </button>
      )}
    </div>
  );
};

// Export a wrapped version with Suspense
export default function VideoPlayerWrapper(props) {
  return (
    <Suspense fallback={
      <div className="w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <div className="animate-pulse bg-gray-700 w-full h-full"></div>
      </div>
    }>
      <VideoPlayer {...props} />
    </Suspense>
  );
} 