#!/usr/bin/env bash

set -uo pipefail

NAMESPACE="${1:?usage: collect-k8s-diagnostics.sh <namespace> [app-label] [public-service]}"
APP_LABEL="${2:-supplie-demo}"
PUBLIC_SERVICE="${3:-supplie-demo-public}"

echo "::group::kubectl current context"
kubectl config current-context || true
echo "::endgroup::"

echo "::group::namespace snapshot"
kubectl get namespace "${NAMESPACE}" -o wide || true
kubectl get all -n "${NAMESPACE}" -o wide || true
kubectl get ingress -n "${NAMESPACE}" -o wide || true
echo "::endgroup::"

echo "::group::deployment describe"
kubectl describe deployment "${APP_LABEL}" -n "${NAMESPACE}" || true
echo "::endgroup::"

echo "::group::service describe"
kubectl describe service "${APP_LABEL}" -n "${NAMESPACE}" || true
kubectl describe service "${PUBLIC_SERVICE}" -n "${NAMESPACE}" || true
echo "::endgroup::"

for pod in $(kubectl get pods -n "${NAMESPACE}" -l "app=${APP_LABEL}" -o name 2>/dev/null || true); do
  echo "::group::${pod} describe"
  kubectl describe "${pod}" -n "${NAMESPACE}" || true
  echo "::endgroup::"

  echo "::group::${pod} logs"
  kubectl logs "${pod}" -n "${NAMESPACE}" --all-containers --tail=200 || true
  echo "::endgroup::"

  echo "::group::${pod} previous logs"
  kubectl logs "${pod}" -n "${NAMESPACE}" --all-containers --previous --tail=200 || true
  echo "::endgroup::"
done

echo "::group::recent events"
kubectl get events -n "${NAMESPACE}" --sort-by=.lastTimestamp || \
  kubectl get events -n "${NAMESPACE}" || true
echo "::endgroup::"
