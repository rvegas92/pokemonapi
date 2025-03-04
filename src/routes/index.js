"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_cache_1 = __importDefault(require("node-cache"));
const pokemon_repositoy_1 = require("../repository/pokemon.repositoy");
const errorlog_1 = require("../utils/errorlog");
const router = express_1.default.Router();
const cache = new node_cache_1.default({ stdTTL: 3600 });
const getAllPokemon = async () => {
    let cachedData = cache.get("allPokemon");
    if (!cachedData) {
        const response = await pokemon_repositoy_1.PokemonRepository.ListarPokemones(1000);
        cachedData = response.data.results;
        cache.set("allPokemon", cachedData);
    }
    return cachedData;
};
router.get("/listar", async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const allPokemon = await getAllPokemon();
        const paginatedPokemon = allPokemon.slice(Number(offset), Number(offset) + Number(limit));
        res.status(200).json({ message: "Pokémon listados", result: paginatedPokemon });
    }
    catch (error) {
        errorlog_1.ErrorLog.save('index.ts', '/listar', error);
        res.status(500).json({ message: "Ocurrió un error", error: error.message });
    }
});
router.get("/busqueda/:codigo", async (req, res) => {
    try {
        const { codigo } = req.params;
        const allPokemon = await getAllPokemon();
        const filteredResults = allPokemon.filter((pokemon) => pokemon.name.toLowerCase().includes(codigo.toLowerCase()));
        res.status(200).json({ message: "Búsqueda de Pokémon", result: filteredResults });
    }
    catch (error) {
        errorlog_1.ErrorLog.save('index.ts', '/busqueda/:codigo', error);
        res.status(500).json({ message: "Ocurrió un error", error: error.message });
    }
});
exports.default = router;
