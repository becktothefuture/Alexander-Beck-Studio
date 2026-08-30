function normalizeDistance(value) {
  const distance = Number(value);
  return Number.isFinite(distance) && distance >= 0 ? distance : Number.POSITIVE_INFINITY;
}

function makeClaimKey(itemId, instanceId) {
  return `${itemId}\u0000${instanceId}`;
}

export function selectBoundedActiveWorldMediaIds(items, visibleIds) {
  const visible = visibleIds instanceof Set ? visibleIds : new Set(visibleIds || []);
  const claimedTypes = new Set();
  const activeIds = new Set();
  (Array.isArray(items) ? items : []).forEach((item) => {
    if (!visible.has(item?.id) || (item?.type !== 'video' && item?.type !== 'code')) return;
    if (claimedTypes.has(item.type)) return;
    claimedTypes.add(item.type);
    activeIds.add(item.id);
  });
  return activeIds;
}

export function createPlaygroundActiveMediaOwnership() {
  const claims = new Map();
  const winnerByItem = new Map();

  const recompute = (itemId) => {
    const previousWinnerKey = winnerByItem.get(itemId) || null;
    let nextWinnerKey = null;
    let nextWinnerDistance = Number.POSITIVE_INFINITY;

    claims.forEach((claim, claimKey) => {
      if (claim.itemId !== itemId || !claim.eligible || !claim.visible) return;
      if (
        nextWinnerKey === null
        || claim.distance < nextWinnerDistance
        || (claim.distance === nextWinnerDistance && claimKey < nextWinnerKey)
      ) {
        nextWinnerKey = claimKey;
        nextWinnerDistance = claim.distance;
      }
    });

    if (previousWinnerKey === nextWinnerKey) return;
    if (previousWinnerKey) {
      claims.get(previousWinnerKey)?.onOwnershipChange(false);
    }
    if (nextWinnerKey) {
      winnerByItem.set(itemId, nextWinnerKey);
      claims.get(nextWinnerKey)?.onOwnershipChange(true);
    } else {
      winnerByItem.delete(itemId);
    }
  };

  const register = ({
    itemId,
    instanceId,
    distance = Number.POSITIVE_INFINITY,
    eligible = false,
    visible = false,
    onOwnershipChange = () => {},
  }) => {
    if (!itemId || !instanceId) {
      throw new TypeError('Active media claims require itemId and instanceId.');
    }
    if (typeof onOwnershipChange !== 'function') {
      throw new TypeError('onOwnershipChange must be a function.');
    }

    const claimKey = makeClaimKey(String(itemId), String(instanceId));
    if (claims.has(claimKey)) {
      throw new Error(`Active media claim already exists for ${itemId}/${instanceId}.`);
    }

    const claim = {
      itemId: String(itemId),
      instanceId: String(instanceId),
      distance: normalizeDistance(distance),
      eligible: Boolean(eligible),
      visible: Boolean(visible),
      onOwnershipChange,
    };
    claims.set(claimKey, claim);
    onOwnershipChange(false);
    recompute(claim.itemId);

    let released = false;
    return {
      isOwner() {
        return !released && winnerByItem.get(claim.itemId) === claimKey;
      },
      update(next = {}) {
        if (released) return false;
        if (Object.hasOwn(next, 'distance')) claim.distance = normalizeDistance(next.distance);
        if (Object.hasOwn(next, 'eligible')) claim.eligible = Boolean(next.eligible);
        if (Object.hasOwn(next, 'visible')) claim.visible = Boolean(next.visible);
        recompute(claim.itemId);
        return winnerByItem.get(claim.itemId) === claimKey;
      },
      release() {
        if (released) return;
        released = true;
        const wasOwner = winnerByItem.get(claim.itemId) === claimKey;
        claims.delete(claimKey);
        if (wasOwner) {
          winnerByItem.delete(claim.itemId);
          onOwnershipChange(false);
        }
        recompute(claim.itemId);
      },
    };
  };

  return {
    register,
    getOwnerInstanceId(itemId) {
      const winner = claims.get(winnerByItem.get(String(itemId)));
      return winner?.instanceId || null;
    },
    clear() {
      winnerByItem.forEach((claimKey) => {
        claims.get(claimKey)?.onOwnershipChange(false);
      });
      winnerByItem.clear();
      claims.clear();
    },
  };
}
