const dpack = require('@etherpacks/dpack')
const ethers = require('ethers');
const ganache = require("ganache")
const { send } = require('minihat')
const fs = require('fs')

module.exports = runner = {}

runner.run = async (output_dir) => {
    const provider = new ethers.providers.Web3Provider(ganache.provider())
    const signer = provider.getSigner()
    const multifab_pack = require('../lib/multifab/pack/multifab_full_hardhat.dpack.json')
    const dapp = await dpack.load(multifab_pack, ethers, signer)
    const multifab = await dapp._types.Multifab.deploy()
    const contracts = {}
    fs.readdirSync(output_dir).filter((f) => f.endsWith('.snek')).forEach(async(file) => {
        const [abi, bytecode] = fs.readFileSync(`${output_dir}/${file}`, {encoding: 'utf-8'}).split("\n")
        const cache_tx = await send(multifab.cache, bytecode);
        [,codehash] = cache_tx.events.find(event => event.event === 'Added').args
        contracts[file] = {
            codehash: codehash
        }
        console.log(contracts)
    });
}
