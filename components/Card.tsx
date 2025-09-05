import React from 'react';

interface CardProps {
  title: string;
  description: string;
  imageUrl?: string;
  buttonText?: string;
  onButtonClick?: () => void;
}

const Card: React.FC<CardProps> = (props) => {
  const {
    title, 
    description, 
    imageUrl, 
    buttonText = "Learn More",
    onButtonClick 
  } = props;

  return (
    <div className="card card-compact w-96 bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
      <figure className="h-56 overflow-hidden">
        <img 
          src={imageUrl || "https://via.placeholder.com/400x250"} 
          alt={title} 
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
        />
      </figure>
      <div className="card-body">
        <h2 className="card-title text-2xl font-bold text-gray-800">{title}</h2>
        <p className="text-gray-600">{description}</p>
        <div className="card-actions justify-end mt-4">
          <button 
            className="btn btn-primary rounded-full px-6"
            onClick={onButtonClick}
          >
            {buttonText}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Card;