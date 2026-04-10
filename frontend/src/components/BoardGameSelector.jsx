import { useState, useEffect } from 'react';
import { dictionariesApi } from '../lib/api';
import './BoardGameSelector.css';

const BoardGameSelector = ({ selectedGames = [], onGamesChange }) => {
  const [boardGames, setBoardGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchBoardGames();
  }, []);

  const fetchBoardGames = async () => {
    try {
      const response = await dictionariesApi.get('board_games');
      setBoardGames(response.data || []);
    } catch (error) {
      console.error('Ошибка загрузки настольных игр:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredGames = boardGames.filter(game =>
    game.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedGames.some(selected => selected.id === game.id)
  );

  const handleAddGame = (game) => {
    onGamesChange([...selectedGames, game]);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleRemoveGame = (gameId) => {
    onGamesChange(selectedGames.filter(game => game.id !== gameId));
  };

  if (loading) {
    return <div>Загрузка игр...</div>;
  }

  return (
    <div className="board-game-selector">
      <label className="form-label">Настольные игры</label>

      {/* Список выбранных игр */}
      {selectedGames.length > 0 && (
        <div className="selected-games">
          {selectedGames.map(game => (
            <div key={game.id} className="selected-game-card">
              <div className="game-info">
                {game.image_url && (
                  <img src={game.image_url} alt={game.name} className="game-image-small" />
                )}
                <div>
                  <h4>{game.name}</h4>
                  <p className="game-meta">
                    👥 {game.min_players}-{game.max_players} игроков •
                    ⏱️ ~{game.avg_playtime_minutes} мин
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveGame(game.id)}
                className="btn-remove"
                aria-label="Удалить игру"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Поиск и добавление игр */}
      <div className="game-search">
        <input
          type="text"
          placeholder="Поиск игры..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          className="search-input"
        />

        {showDropdown && searchQuery && filteredGames.length > 0 && (
          <div className="games-dropdown">
            {filteredGames.slice(0, 5).map(game => (
              <div
                key={game.id}
                className="game-option"
                onClick={() => handleAddGame(game)}
              >
                {game.image_url && (
                  <img src={game.image_url} alt={game.name} className="game-image-tiny" />
                )}
                <div className="game-option-info">
                  <strong>{game.name}</strong>
                  <p className="game-meta-small">
                    {game.min_players}-{game.max_players} игроков • {game.avg_playtime_minutes} мин
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="help-text">
        Выберите одну или несколько игр для этого события
      </p>
    </div>
  );
};

export default BoardGameSelector;
