"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PokemonRepository = void 0;
const axios_1 = __importDefault(require("axios"));
var PokemonRepository;
(function (PokemonRepository) {
    async function ListarPokemones(limit) {
        return await axios_1.default.get(`https://pokeapi.co/api/v2/pokemon?limit=${limit}`);
    }
    PokemonRepository.ListarPokemones = ListarPokemones;
})(PokemonRepository || (exports.PokemonRepository = PokemonRepository = {}));
