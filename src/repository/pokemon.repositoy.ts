import { DataBase as db } from '../utils/database.manager';
import axios from "axios";

export namespace PokemonRepository {

    export async function ListarPokemones(limit: number) {
        return await axios.get(`https://pokeapi.co/api/v2/pokemon?limit=${limit}`);
    }
}