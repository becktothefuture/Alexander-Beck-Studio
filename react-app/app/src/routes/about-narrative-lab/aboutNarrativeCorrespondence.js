function cloneOutput(output) {
  return {
    ...output,
    positions: output.positions.slice(),
    presence: output.presence.slice(),
    size: output.size.slice(),
    attributes: Object.fromEntries(Object.entries(output.attributes || {}).map(([key, value]) => [key, value.slice()])),
  };
}

function swapPoint(output, fromIndex, toIndex) {
  if (fromIndex === toIndex) return;
  for (let axis = 0; axis < 3; axis += 1) {
    const a = (fromIndex * 3) + axis;
    const b = (toIndex * 3) + axis;
    [output.positions[a], output.positions[b]] = [output.positions[b], output.positions[a]];
  }
  [output.presence[fromIndex], output.presence[toIndex]] = [output.presence[toIndex], output.presence[fromIndex]];
  [output.size[fromIndex], output.size[toIndex]] = [output.size[toIndex], output.size[fromIndex]];
  Object.values(output.attributes || {}).forEach((attribute) => {
    [attribute[fromIndex], attribute[toIndex]] = [attribute[toIndex], attribute[fromIndex]];
  });
}

function applyGroupAware(fromOutput, toOutput) {
  const fromGroups = fromOutput.attributes?.disciplineGroup;
  const toGroups = toOutput.attributes?.disciplineGroup;
  if (!fromGroups || !toGroups) return toOutput;
  const output = cloneOutput(toOutput);
  const groupTarget = new Map();
  for (let index = 0; index < toGroups.length; index += 1) {
    if (toGroups[index] > 0) groupTarget.set(toGroups[index], index);
  }
  for (let index = 0; index < fromGroups.length; index += 1) {
    const group = fromGroups[index];
    const targetIndex = groupTarget.get(group);
    if (group > 0 && Number.isInteger(targetIndex)) swapPoint(output, index, targetIndex);
  }
  return output;
}

export function applyAboutNarrativeCorrespondence(fromOutput, toOutput, mode = 'index-v1') {
  // Every generator writes into the canonical seeded pool. index-v1 and stable-seed
  // are therefore both allocation-free identity mappings during playback.
  if (mode === 'group-aware') return applyGroupAware(fromOutput, toOutput);
  return toOutput;
}
