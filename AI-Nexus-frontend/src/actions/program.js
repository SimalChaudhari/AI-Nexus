import { useState, useEffect } from 'react';
import { programService } from 'src/services/program.service';

export function useGetProgram(programId) {
  const [program, setProgram] = useState(null);
  const [programLoading, setProgramLoading] = useState(true);
  const [programError, setProgramError] = useState(null);

  useEffect(() => {
    if (!programId) {
      setProgramLoading(false);
      return;
    }
    programService
      .getProgramById(programId)
      .then(setProgram)
      .catch((e) => {
        setProgramError(e?.message || 'Failed to fetch program');
        setProgram(null);
      })
      .finally(() => setProgramLoading(false));
  }, [programId]);

  return { program, programLoading, programError };
}
