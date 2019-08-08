#!/bin/bash

[[ "$2" == "light" ]] && light="--syncmode light" || light=""
[[ "$2" == "mine" ]]  && mine="--mine" || mine=""

geth --syncmode full --identity "node$1" --networkid 42 console --datadir "ethdata$1" \
--nodiscover $mine --rpc --rpcport $((8042 + $1)) --port $((30303 + $1)) --unlock 0 \
--password "password.sec"
