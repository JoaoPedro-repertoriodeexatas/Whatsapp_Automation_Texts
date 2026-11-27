import {
  getInstanceStatus,
  listEvolutionInstances,
} from '../services/evolutionService.js';
import {
  listConversationMessages,
  listConversations,
  listDistinctInstances,
} from '../services/messageService.js';
import { addSseClient } from '../services/sseService.js';
import { formatError, logError } from '../services/terminalLogger.js';

export function handleSseEvents(req, res) {
  addSseClient(req, res);
}

export async function handleListApiInstances(_req, res) {
  try {
    const [dbInstanceNames, evolutionInstances] = await Promise.all([
      listDistinctInstances(),
      listEvolutionInstances(),
    ]);

    const evolutionMap = new Map(
      evolutionInstances.map((item) => [item.instanceName, item]),
    );

    const allNames = Array.from(
      new Set([...dbInstanceNames, ...evolutionMap.keys()]),
    ).sort((a, b) => a.localeCompare(b));

    const instances = await Promise.all(
      allNames.map(async (instanceName) => {
        try {
          const liveStatus = await getInstanceStatus(instanceName);
          return {
            instanceName: liveStatus.instanceName,
            state: liveStatus.state,
            connected: liveStatus.connected,
          };
        } catch {
          const fallback = evolutionMap.get(instanceName);
          return {
            instanceName,
            state: fallback?.state ?? 'unknown',
            connected: fallback?.connected ?? false,
          };
        }
      }),
    );

    return res.status(200).json({ instances });
  } catch (error) {
    logError('API', 'Erro ao listar instâncias', error);
    return res.status(500).json({
      error: `Falha ao listar instâncias: ${formatError(error)}`,
    });
  }
}

export async function handleListConversations(req, res) {
  try {
    const instancia = typeof req.query.instancia === 'string' ? req.query.instancia.trim() : null;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : null;
    const onlyDocuments =
      req.query.onlyDocuments === 'true' || req.query.onlyDocuments === '1';

    const conversations = await listConversations({
      instancia: instancia || null,
      search: search || null,
      onlyDocuments,
    });

    return res.status(200).json({ conversations });
  } catch (error) {
    logError('API', 'Erro ao listar conversas', error);
    return res.status(500).json({
      error: `Falha ao consultar conversas: ${formatError(error)}`,
    });
  }
}

export async function handleListConversationMessages(req, res) {
  try {
    const instancia = typeof req.params.instancia === 'string' ? req.params.instancia.trim() : '';
    const telefone = typeof req.params.telefone === 'string' ? req.params.telefone.trim() : '';

    if (!instancia || !telefone) {
      return res.status(400).json({
        error: 'Parâmetros "instancia" e "telefone" são obrigatórios.',
      });
    }

    const limit = req.query.limit ?? 200;
    const offset = req.query.offset ?? 0;

    const messages = await listConversationMessages({
      instancia,
      telefone,
      limit,
      offset,
    });

    return res.status(200).json({
      instancia,
      telefone,
      messages,
    });
  } catch (error) {
    logError('API', 'Erro ao carregar mensagens da conversa', error);
    return res.status(500).json({
      error: `Falha ao carregar mensagens: ${formatError(error)}`,
    });
  }
}
