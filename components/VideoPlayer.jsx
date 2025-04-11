'use client';
import { useState } from 'react';

export default function VideoPlayer({ videoUrl, trailerUrl, title }) {
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);

  if (!videoUrl && !trailerUrl) {
    return null;
  }

  return (
    <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
      {isPlayingTrailer ? (
        <iframe
          src={trailerUrl}
          title={`${title} Trailer`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <video
          src={videoUrl}
          controls
          className="w-full h-full"
          poster={`https://image.tmdb.org/t/p/w500${title}`}
        >
          Your browser does not support the video tag.
        </video>
      )}
      
      {trailerUrl && (
        <button
          onClick={() => setIsPlayingTrailer(!isPlayingTrailer)}
          className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-4 py-2 rounded hover:bg-opacity-75"
        >
          {isPlayingTrailer ? 'Watch Movie' : 'Watch Trailer'}
        </button>
      )}
    </div>
  );
} 