import React, { useState, useEffect, FormEvent, useRef } from 'react';
import axios from 'axios';
import './App.css';
import Fireworks from "./Fireworks";

// Dołączamy deklarację biblioteki confetti
declare const confetti: {
  start: (timeout?: number, min?: number, max?: number) => void;
  stop: () => void;
  toggle: () => void;
  pause: () => void;
  resume: () => void;
  togglePause: () => void;
  isPaused: () => boolean;
  remove: () => void;
  isRunning: () => boolean;
};

// Define types based on your backend DTOs
interface Character {
  name: string;
  gender: string;
  house: string;
  bloodStatus: string;
  occupation: string;
  birthYear: number;
}

interface Check {
  CORRECT: string;
  PARTIALLY_CORRECT: string;
  INCORRECT: string;
  IS_YOUNGER: string;
  IS_OLDER: string;
}

interface CharacterResponse {
  howManyCorrect: Array<Record<string, Check>>;
  isCorrect: boolean;
}

interface GuessResult {
  character: string;
  results: Array<Record<string, Check>>;
  isCorrect: boolean;
}

// Add axios default configuration
axios.defaults.headers.post['Content-Type'] = 'application/json';
axios.defaults.headers.common['Accept'] = 'application/json';

function App() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterNames, setCharacterNames] = useState<string[]>([]);
  const [guessInput, setGuessInput] = useState<string>('');
  const [guessResults, setGuessResults] = useState<GuessResult[]>([]);
  const [dailyCharacter, setDailyCharacter] = useState<Character | null>(null);
  const [isGameWon, setIsGameWon] = useState<boolean>(false);
  const [totalGuesses, setTotalGuesses] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isRestarting, setIsRestarting] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // Animation state
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const latestGuessRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize the daily character and get all characters when component mounts
    initializeGame();
    fetchAllCharacters();
    fetchAllCharacterNames();
  }, []);

  // Efekt dla obsługi konfetti po wygranej
  useEffect(() => {
    if (isGameWon) {
      // Uruchamiamy konfetti gdy gra jest wygrana
      if (typeof confetti !== 'undefined') {
        confetti.start(10000, 100, 150); // Uruchom konfetti na 10 sekund z dużą ilością cząstek
      }
    } else {
      // Zatrzymujemy konfetti gdy gra jest resetowana
      if (typeof confetti !== 'undefined' && confetti.isRunning()) {
        confetti.stop();
      }
    }

    // Czyszczenie konfetti przy odmontowaniu komponentu
    return () => {
      if (typeof confetti !== 'undefined' && confetti.isRunning()) {
        confetti.remove();
      }
    };
  }, [isGameWon]);

  // Effect to handle animation and scrolling to the latest guess
  useEffect(() => {
    if (guessResults.length > 0 && latestGuessRef.current) {
      // Scroll to the latest guess
      latestGuessRef.current.scrollIntoView({ behavior: 'smooth' });

      // Start the animation
      setIsAnimating(true);

      // Add the visible class to each attribute with a delay
      const attributes = latestGuessRef.current.querySelectorAll('.attribute-result');
      attributes.forEach((attr, index) => {
        setTimeout(() => {
          attr.classList.add('visible');
        }, 100 * index); // Staggered delay for each attribute
      });

      // Reset animation state after all animations are finished
      setTimeout(() => {
        setIsAnimating(false);
      }, attributes.length * 100 + 800); // Total animation time
    }
  }, [guessResults.length]);

  const filteredCharacters = characterNames.filter(name =>
      name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !guessResults.some(result => result.character.toLowerCase() === name.toLowerCase())
  );

  const initializeGame = async (): Promise<void> => {
    try {
      setIsRestarting(true);
      const response = await axios.get<Character>('http://165.227.166.171:8080/api/getDailyCharacter');
      setDailyCharacter(response.data);
      setError(null);
      setIsRestarting(false);
    } catch (error) {
      console.error('Error initializing game:', error);
      setError('Failed to initialize game. Please try refreshing the page.');
      setIsRestarting(false);
    }
  };

  const restartGame = async (): Promise<void> => {
    try {
      setIsRestarting(true);
      // Zatrzymaj konfetti przy restarcie
      if (typeof confetti !== 'undefined' && confetti.isRunning()) {
        confetti.remove();
      }

      // Reset game state
      setGuessResults([]);
      setGuessInput('');
      setSearchTerm('');
      setIsGameWon(false);

      // Get a new character
      const response = await axios.get<Character>('http://165.227.166.171:8080/api/getDailyCharacter');
      setDailyCharacter(response.data);
      setError(null);
      setIsRestarting(false);
    } catch (error) {
      console.error('Error restarting game:', error);
      setError('Failed to restart game. Please try refreshing the page.');
      setIsRestarting(false);
    }
  };

  const fetchAllCharacters = async (): Promise<void> => {
    try {
      const response = await axios.get<Character[]>('http://165.227.166.171:8080/api/characters');
      setCharacters(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching characters:', error);
      setError('Failed to fetch character data.');
    }
  };

  const fetchAllCharacterNames = async (): Promise<void> => {
    try {
      const response = await axios.get<string[]>('http://165.227.166.171:8080/api/allCharactersName');
      setCharacterNames(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching character names:', error);
      setError('Failed to fetch character names.');
    }
  };

  const handleGuessSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!guessInput.trim()) return;

    // Disable animation when submitting a new guess
    setIsAnimating(false);

    try {
      // Use correct JSON structure for the request
      const response = await axios.post<CharacterResponse>(
          'http://165.227.166.171:8080/api/guess',
          { guess: guessInput }
      );

      setGuessResults([...guessResults, {
        character: guessInput,
        results: response.data.howManyCorrect,
        isCorrect: response.data.isCorrect
      }]);

      if (response.data.isCorrect) {
        setIsGameWon(true);
        setTotalGuesses(totalGuesses + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Dodajemy uruchomienie konfetti po wygranej
        if (typeof confetti !== 'undefined') {
          confetti.start(10000, 100, 150);
        }
      }

      setGuessInput('');
      setSearchTerm('');
      setError(null);
    } catch (error) {
      console.error('Error submitting guess:', error);
      setError('Failed to submit your guess. Please try again.');
    }
  };

  const renderGuessHistory = () => {
    return guessResults.map((result, index) => (
        <div
            key={index}
            className="guess-result-row"
            ref={index === guessResults.length - 1 ? latestGuessRef : null}
        >
          <div className="guess-name">{result.character}</div>
          {result.results.map((attribute, attrIndex) => {
            const [key, value] = Object.entries(attribute)[0];
            return (
                <div
                    key={`${index}-${attrIndex}`}
                    className={`attribute-result ${String(value)}`}
                >
                  {getDisplayAttribute(key, result.character)}
                </div>
            );
          })}
        </div>
    ));
  };

  const getCharacterAttr = (attr: keyof Character): string => {
    const characterName = guessResults[guessResults.length - 1].character;
    const character = characters.find(c => c.name === characterName);
    if (!character) return 'Nieznane';

    return character[attr].toString();
  };


  const renderWinningMessage = () => {
    return (
        <div className="winning-message">
          <div className="winning-badge">
            <span>✨</span> ZWYCIĘSTWO! <span>✨</span>
          </div>
          <h2>Gratulacje! Odgadłeś dzisiejszego bohatera!</h2>
          <p>Prawidłowa odpowiedź: {guessResults[guessResults.length - 1].character}</p>
          <p>Liczba prób: {guessResults.length}</p>
          <div className="character-info">
            <img
                src="/api/placeholder/100/100"
                className="character-avatar"
            />
            <div className="character-details">
              <p><strong>Dom:</strong> {getCharacterAttr("house")}</p>
              <p><strong>Zajęcie:</strong> {getCharacterAttr("occupation")}</p>
              <p><strong>Status krwi:</strong> {getCharacterAttr("bloodStatus")}</p>
              <p><strong>Rok urodzenia:</strong> {getCharacterAttr("birthYear")}</p>
            </div>
          </div>
          <button
              className="restart-button"
              onClick={restartGame}
              disabled={isRestarting}
          >
            {isRestarting ? 'Ładowanie...' : 'Zagraj ponownie'}
          </button>
        </div>
    );
  };


  const getDisplayAttribute = (key: string, characterName: string): string => {
    const character = characters.find(c => c.name === characterName);
    if (!character) return 'Unknown';

    switch(key) {
      case 'name': return character.name;
      case 'gender': return character.gender;
      case 'house': return character.house;
      case 'bloodStatus': return character.bloodStatus;
      case 'occupation': return character.occupation;
      case 'birthYear': return character.birthYear.toString();
      default: return 'Unknown';
    }
  };

  const renderAttributeHeaders = () => {
    return (
        <div className="attribute-headers">
          <div>Name</div>
          <div>Gender</div>
          <div>House</div>
          <div>Blood Status</div>
          <div>Occupation</div>
          <div>Birth Year</div>
          <div></div>
          <div></div>
        </div>
    );
  };

  return (
      <div className="harry-potter-wordle">
        {isGameWon && <div className="fullscreen-fireworks"><Fireworks /></div>}
        {isGameWon && <div className="fullscreen-fireworks"><Fireworks /></div>}
        <header>
          <h1>Potterdle</h1>
          <h2>Odgadnij dzisiejszego bohatera z Harry'ego Pottera!</h2>
          <p>{totalGuesses} osób już odgadło!</p>
        </header>

        <div className="game-container">
          {error && <div className="error-message">{error}</div>}

          {!isGameWon ? (
              <form onSubmit={handleGuessSubmit} className="search-form">
                <div className="input-container">
                  <div className="autocomplete-container">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder="Type to search characters..."
                        disabled={isGameWon || isAnimating || isRestarting}
                    />
                    {showSuggestions && searchTerm && (
                        <div className="suggestion-list">
                          {filteredCharacters.length > 0 ? (
                              filteredCharacters.map(name => (
                                  <div
                                      key={name}
                                      className="suggestion-item"
                                      onClick={() => {
                                        setGuessInput(name);
                                        setSearchTerm(name);
                                        setShowSuggestions(false);
                                      }}
                                  >
                                    {name}
                                  </div>
                              ))
                          ) : (
                              <div className="suggestion-item">No matches found</div>
                          )}
                        </div>
                    )}
                  </div>
                  <button type="submit" disabled={isGameWon || !guessInput || isAnimating || isRestarting}>
                    <span>→</span>
                  </button>
                </div>
              </form>
          ) : (
              renderWinningMessage()
          )}
          <div className="guess-history">
            {renderAttributeHeaders()}
            {renderGuessHistory()}
          </div>
        </div>
      </div>
  );
}

export default App;